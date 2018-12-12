'use strict';

const expect = require('chai').expect;
const path = require('path');
const eos = require('eosjs-node').connect({ url: 'http://127.0.0.1:7777' });
const randomstring = require('randomstring');

// Generate symbols to scope different parts of the test to avoid needing to
// spend the time tearing things down
const generateSymbol = () =>
  randomstring.generate({
    length: 7,
    charset: 'alphabetic',
    capitalization: 'uppercase',
  });

// Using jest-circus test runner to ensure (before|after)All don't run in skipped
// blocks https://github.com/facebook/jest/issues/6755 and https://github.com/facebook/jest/issues/6166
describe('escrow', () => {
  jest.setTimeout(15e3);

  const escrow = {
    account: eos.generateAccountName(),
    contract: 'escrow',
  };
  const token = {
    account: 'eosio.token',
    contract: 'eosio.token',
  };

  const sendTransaction = async actions => {
    actions = Array.isArray(actions) ? actions : [actions];
    return await eos.sendTransaction(
      actions.map(({ name, data, actor, account }) => {
        console.log(`Issuing action: ${name} for ${actor || account} on ${account}`);
        return eos.createAction({
          name,
          account,
          actor: actor || account,
          data,
        });
      })
    );
  };

  // use "beforeAll" to speed up tests (preventing the need to tear down after each)
  beforeAll(async () => {
    // create accounts for an deploy both tokens
    await eos.createAccount({ account: token.account });
    await eos.deploy({
      account: token.account,
      contract: token.contract,
      contractDir: path.join(
        __dirname,
        '..',
        '..',
        '..',
        'contracts',
        'escrowed-token',
        token.contract
      ),
    });
    await eos.createAccount({ account: escrow.account });
    await eos.deploy({
      account: escrow.account,
      contract: escrow.contract,
      contractDir: path.join(__dirname, '..', '..', '..', 'contracts', 'escrowed-token', 'escrow'),
    });
    // ensure escrow can issue actions (transfer back to token contract)
    await sendTransaction({
      account: 'eosio',
      name: 'updateauth',
      actor: escrow.account,
      data: {
        account: escrow.account,
        permission: 'active',
        parent: 'owner',
        auth: {
          threshold: 1,
          keys: [{ key: eos.api.signatureProvider.availableKeys[0], weight: 1 }],
          accounts: [
            { permission: { actor: escrow.account, permission: 'eosio.code' }, weight: 1 },
          ],
          waits: [],
        },
      },
    });
  }, 30e3);

  describe('when a user is transferred 100 tokens', () => {
    let username;
    let symbol;
    let promise;
    beforeAll(async () => {
      username = eos.generateAccountName();
      symbol = generateSymbol();
      await eos.createAccount({ account: username });

      promise = sendTransaction([
        {
          name: 'create',
          account: token.account,
          data: {
            issuer: token.account,
            maximum_supply: `999999 ${symbol}`,
          },
        },
        {
          name: 'issue',
          account: token.account,
          data: {
            to: escrow.account,
            quantity: `100 ${symbol}`,
            memo: username,
          },
        },
      ]);
    });

    test('then it fails as there is no period for that symbol', done => {
      promise
        .then(() => done('Should have failed'))
        .catch(err => {
          expect(err.message).to.contain(
            'Some periods must exist in order to accept incoming transfers'
          );
          done();
        });
    });
  });

  describe('when a user exists', () => {
    let symbol;
    let actor;
    beforeAll(async () => {
      symbol = generateSymbol();
      actor = eos.generateAccountName();
      await eos.createAccount({ account: actor });
    });
    describe('and they attempt to addperiod', () => {
      let promise;
      beforeAll(() => {
        promise = sendTransaction({
          name: 'addperiod',
          account: escrow.account,
          actor,
          data: {
            symbol_str: symbol,
            timestamp: new Date().getTime(),
            numerator: 2,
            denominator: 4,
          },
        });
      });
      test('then it fails due to not being the contract authority', done => {
        promise
          .then(() => done('Should not have succeeded!'))
          .catch(err => {
            // Note: due to an issue with jest-circus runner, if this fails,
            // the done() won't get hit and we'll have to wait for the timeout
            expect(err.message).to.contain(`missing authority of ${escrow.account}`);
            done();
          });
      });
    });
  });

  describe('invalid periods cannot be added', () => {
    ['Numerator', 'Denominator'].forEach(side => {
      describe(`when a period is added with a 0 ${side}`, () => {
        let symbol;
        let promise;
        beforeAll(() => {
          symbol = generateSymbol();

          promise = sendTransaction([
            {
              name: 'addperiod',
              account: escrow.account,
              data: {
                symbol_str: symbol,
                timestamp: new Date().getTime() - 1000 * 3600 * 24 * 7,
                numerator: side === 'Numerator' ? 0 : 1,
                denominator: side === 'Denominator' ? 0 : 1,
              },
            },
          ]);
        });
        test('then it fails with 0 ${size} error', done => {
          promise
            .then(() => done('Should not have succeeded!'))
            .catch(err => {
              expect(err.message).to.contain(`${side} must be greater than 0`);
              done();
            });
        });
      });
    });

    describe('when a second period is added with a different denominator', () => {
      let symbol;
      let promise;
      beforeAll(() => {
        symbol = generateSymbol();

        promise = sendTransaction([
          {
            name: 'addperiod',
            account: escrow.account,
            data: {
              symbol_str: symbol,
              timestamp: new Date().getTime() - 1000 * 3600 * 24 * 28,
              numerator: 2,
              denominator: 3,
            },
          },
          {
            name: 'addperiod',
            account: escrow.account,
            data: {
              symbol_str: symbol,
              timestamp: new Date().getTime() - 1000 * 3600 * 24 * 7,
              numerator: 1,
              denominator: 4,
            },
          },
        ]);
      });
      test('then it fails with different denominator error', done => {
        promise
          .then(() => done('Should not have succeeded!'))
          .catch(err => {
            expect(err.message).to.contain(
              'Cannot add a new escrow as supplied denominator does not match denominator'
            );
            done();
          });
      });
    });
  });

  // when periods exist
  describe('when a period of 2/4 has been added for four weeks ago', () => {
    describe('and a period of 1/4 has been added for a week ago', () => {
      describe('and a period of 1/4 has been added for a week in the future', () => {
        describe('when a user is added with 100 tokens', () => {
          describe('when another user is added with 10.51 tokens', () => {
            let symbol;
            let user1;
            let user2;
            beforeAll(async () => {
              symbol = generateSymbol();

              user1 = eos.generateAccountName();
              user2 = eos.generateAccountName();
              await eos.createAccount({ account: user1 });
              await eos.createAccount({ account: user2 });
              // combine actions for faster tests
              await sendTransaction([
                {
                  name: 'addperiod',
                  account: escrow.account,

                  data: {
                    symbol_str: symbol,
                    timestamp: new Date().getTime() - 1000 * 3600 * 24 * 28,
                    numerator: 2,
                    denominator: 4,
                  },
                },
                {
                  name: 'addperiod',
                  account: escrow.account,
                  data: {
                    symbol_str: symbol,
                    timestamp: new Date().getTime() - 1000 * 3600 * 24 * 7,
                    numerator: 1,
                    denominator: 4,
                  },
                },
                {
                  name: 'addperiod',
                  account: escrow.account,
                  data: {
                    symbol_str: symbol,
                    timestamp: new Date().getTime() + 1000 * 3600 * 24 * 7,
                    numerator: 1,
                    denominator: 4,
                  },
                },
                {
                  name: 'create',
                  account: token.account,
                  data: {
                    issuer: token.account,
                    maximum_supply: `100000.00 ${symbol}`,
                  },
                },
                {
                  name: 'issue',
                  account: token.account,
                  data: {
                    to: escrow.account,
                    quantity: `100.00 ${symbol}`,
                    memo: user1,
                  },
                },
                {
                  name: 'issue',
                  account: token.account,
                  data: {
                    to: escrow.account,
                    quantity: `10.51 ${symbol}`,
                    memo: user2,
                  },
                },
              ]);
            });
            describe('when the currency balance is fetched for user1', () => {
              let response;
              beforeAll(async () => {
                [response] = await eos.api.rpc.get_currency_balance(escrow.account, user1);
              });
              test('then their balance must show the correct amount', () => {
                expect(response).to.equal(`100.00 ${symbol}`);
              });
            });
            describe('when the currency balance in tokens fetched for user1', () => {
              let response;
              beforeAll(async () => {
                [response] = await eos.api.rpc.get_currency_balance(token.account, user1);
              });
              test('then their balance must show nothing', () => {
                expect(response).to.be.undefined;
              });
            });
            describe('when the currency balance is fetched for user2', () => {
              let response;
              beforeAll(async () => {
                [response] = await eos.api.rpc.get_currency_balance(escrow.account, user2);
              });
              test('then their balance must show the correct amount', () => {
                expect(response).to.equal(`10.51 ${symbol}`);
              });
            });
            describe('when the currency balance in tokens fetched for user2', () => {
              let response;
              beforeAll(async () => {
                [response] = await eos.api.rpc.get_currency_balance(token.account, user2);
              });
              test('then their balance must show nothing', () => {
                expect(response).to.be.undefined;
              });
            });

            describe('when vest is called for each user', () => {
              beforeAll(async () => {
                await sendTransaction([
                  {
                    name: 'vest',
                    account: escrow.account,
                    data: {
                      symbol_str: symbol,
                      user: user1,
                    },
                  },
                  {
                    name: 'vest',
                    account: escrow.account,
                    data: {
                      symbol_str: symbol,
                      user: user2,
                    },
                  },
                ]);
              });
              describe('when the currency balance is fetched for user1', () => {
                let response;
                beforeAll(async () => {
                  [response] = await eos.api.rpc.get_currency_balance(escrow.account, user1);
                });
                test('then their balance must show the correct amount of 1/4 remaining', () => {
                  expect(response).to.equal(`25.00 ${symbol}`);
                });
              });
              describe('when the currency balance in tokens fetched for user1', () => {
                let response;
                beforeAll(async () => {
                  [response] = await eos.api.rpc.get_currency_balance(token.account, user1);
                });
                test('then their balance must show the vested amount', () => {
                  expect(response).to.equal(`75.00 ${symbol}`);
                });
              });

              describe('when the currency balance is fetched for user2', () => {
                let response;
                beforeAll(async () => {
                  [response] = await eos.api.rpc.get_currency_balance(escrow.account, user2);
                });
                test('then their balance must show the correct amount of 1/4 remaining', () => {
                  expect(response).to.equal(`2.63 ${symbol}`);
                });
              });
              describe('when the currency balance in tokens fetched for user2', () => {
                let response;
                beforeAll(async () => {
                  [response] = await eos.api.rpc.get_currency_balance(token.account, user2);
                });
                test('then their balance must be show the vested amount', () => {
                  expect(response).to.equal(`7.88 ${symbol}`);
                });
              });
              describe('when vest is called again', () => {
                beforeAll(async () => {
                  await sendTransaction([
                    {
                      name: 'vest',
                      account: escrow.account,
                      data: {
                        symbol_str: symbol,
                        user: user1,
                      },
                    },
                    {
                      name: 'vest',
                      account: escrow.account,
                      data: {
                        symbol_str: symbol,
                        user: user2,
                      },
                    },
                  ]);
                });
                describe('when the currency balance is fetched again for user1', () => {
                  let response;
                  beforeAll(async () => {
                    [response] = await eos.api.rpc.get_currency_balance(escrow.account, user1);
                  });
                  test('then their balance must be unchanged', () => {
                    expect(response).to.equal(`25.00 ${symbol}`);
                  });
                });
                describe('when the currency balance in tokens fetched for user1', () => {
                  let response;
                  beforeAll(async () => {
                    [response] = await eos.api.rpc.get_currency_balance(token.account, user1);
                  });
                  test('then their balance is unchanged', () => {
                    expect(response).to.equal(`75.00 ${symbol}`);
                  });
                });
                describe('when the currency balance is fetched again for user2', () => {
                  let response;
                  beforeAll(async () => {
                    [response] = await eos.api.rpc.get_currency_balance(escrow.account, user2);
                  });
                  test('then their balance must be unchanged', () => {
                    expect(response).to.equal(`2.63 ${symbol}`);
                  });
                });
                describe('when the currency balance in tokens fetched for user2', () => {
                  let response;
                  beforeAll(async () => {
                    [response] = await eos.api.rpc.get_currency_balance(token.account, user2);
                  });
                  test('then their balance must be unchanged', () => {
                    expect(response).to.equal(`7.88 ${symbol}`);
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('when a period of 1/3 has been added for four weeks ago', () => {
    describe('when a user is added with 100 tokens', () => {
      let symbol;
      let user;
      beforeAll(async () => {
        symbol = generateSymbol();

        user = eos.generateAccountName();
        console.log('creating user: ', user);
        await eos.createAccount({ account: user });
        // combine actions for faster tests
        await sendTransaction([
          {
            name: 'addperiod',
            account: escrow.account,

            data: {
              symbol_str: symbol,
              timestamp: new Date().getTime() - 1000 * 3600 * 24 * 28,
              numerator: 1,
              denominator: 3,
            },
          },
          {
            name: 'create',
            account: token.account,
            data: {
              issuer: token.account,
              maximum_supply: `100000.00 ${symbol}`,
            },
          },
          {
            name: 'issue',
            account: token.account,
            data: {
              to: escrow.account,
              quantity: `100.00 ${symbol}`,
              memo: user,
            },
          },
        ]);
      });
      describe('when attempting to delete the user1', () => {
        let promise;
        beforeAll(() => {
          promise = sendTransaction({
            name: 'delaccount',
            account: escrow.account,
            data: {
              user: user,
              symbol_str: symbol,
            },
          });
        });
        test('then it fails as the balance is greater than 0', done => {
          promise
            .then(() => done('Should have failed'))
            .catch(err => {
              expect(err.message).to.contain(
                'Cannot remove a user who still has a remaining balance for this symbol'
              );
              done();
            });
        });
      });

      describe('when vest is called for the user', () => {
        beforeAll(async () => {
          await sendTransaction([
            {
              name: 'vest',
              account: escrow.account,
              data: {
                symbol_str: symbol,
                user: user,
              },
            },
          ]);
        });

        describe('when the currency balance in escrow is fetched for the user', () => {
          let response;
          beforeAll(async () => {
            [response] = await eos.api.rpc.get_currency_balance(escrow.account, user);
          });
          test('then their balance must be show the vested parts', () => {
            expect(response).to.equal(`66.67 ${symbol}`);
          });
        });
        describe('when the currency balance in tokens fetched for the user', () => {
          let response;
          beforeAll(async () => {
            [response] = await eos.api.rpc.get_currency_balance(token.account, user);
          });
          test('then their balance must be show the vested parts', () => {
            expect(response).to.equal(`33.33 ${symbol}`);
          });
        });

        describe('when the user is issued another 100 tokens', () => {
          beforeAll(async () => {
            await sendTransaction([
              {
                name: 'issue',
                account: token.account,
                data: {
                  to: escrow.account,
                  quantity: `100.00 ${symbol}`,
                  memo: user,
                },
              },
            ]);
          });
          describe('when the currency balance is fetched again for the user', () => {
            let response;
            beforeAll(async () => {
              [response] = await eos.api.rpc.get_currency_balance(escrow.account, user);
            });
            test('then their balance must show the new value', () => {
              expect(response).to.equal(`166.67 ${symbol}`);
            });
          });
          describe('when the currency balance in tokens fetched for the user', () => {
            let response;
            beforeAll(async () => {
              [response] = await eos.api.rpc.get_currency_balance(token.account, user);
            });
            test('then their balance must be show the original vested parts', () => {
              expect(response).to.equal(`33.33 ${symbol}`);
            });
          });
          describe('when vest is called again for the user', () => {
            beforeAll(async () => {
              await sendTransaction([
                {
                  name: 'vest',
                  account: escrow.account,
                  data: {
                    symbol_str: symbol,
                    user: user,
                  },
                },
              ]);
            });

            describe('when the currency balance is fetched for the user', () => {
              let response;
              beforeAll(async () => {
                [response] = await eos.api.rpc.get_currency_balance(escrow.account, user);
              });
              test('then their balance must show the newly vested parts', () => {
                expect(response).to.equal(`133.34 ${symbol}`);
              });
            });
            describe('when the currency balance in tokens fetched for the user', () => {
              let response;
              beforeAll(async () => {
                [response] = await eos.api.rpc.get_currency_balance(token.account, user);
              });
              test('then their balance must be show this new amount', () => {
                expect(response).to.equal(`66.66 ${symbol}`);
              });
            });

            describe('when a period is added for the remaining 2/3 in the past', () => {
              describe('when vested', () => {
                describe('when attempting to delete the user', () => {
                  let promise;
                  beforeAll(() => {
                    promise = sendTransaction([
                      {
                        name: 'addperiod',
                        account: escrow.account,

                        data: {
                          symbol_str: symbol,
                          timestamp: new Date().getTime() - 1000 * 3600 * 24,
                          numerator: 2,
                          denominator: 3,
                        },
                      },
                      {
                        name: 'vest',
                        account: escrow.account,
                        data: {
                          symbol_str: symbol,
                          user: user,
                        },
                      },
                      {
                        name: 'delaccount',
                        account: escrow.account,
                        data: {
                          user: user,
                          symbol_str: symbol,
                        },
                      },
                    ]);
                  });
                  test('then the account is deleted as expected', () => {
                    return promise;
                  });
                  describe('when the currency balance in escrow is fetched for the user', () => {
                    let response;
                    beforeAll(async () => {
                      [response] = await eos.api.rpc.get_currency_balance(escrow.account, user);
                    });
                    test('then their balance must show undefined', () => {
                      expect(response).to.be.undefined;
                    });
                  });
                  describe('when the currency balance in tokens fetched for the user', () => {
                    let response;
                    beforeAll(async () => {
                      [response] = await eos.api.rpc.get_currency_balance(token.account, user);
                    });
                    test('then their balance must show the full amount', () => {
                      expect(response).to.equal(`200.00 ${symbol}`);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
