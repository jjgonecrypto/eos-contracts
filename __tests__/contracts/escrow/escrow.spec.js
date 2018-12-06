'use strict';

const expect = require('chai').expect;
const path = require('path');
const eos = require('eosjs-node').connect({ url: 'http://127.0.0.1:7777' });

// actions
// addperiod '["JAYS", 1514764800000, 2, 4]' -p escrow
// addperiod '["JAYS", 1536300800000, 1, 4]' -p escrow
// addperiod '["JAYS", 1546300800000, 1, 4]' -p escrow

// addaccount '["user1","100 JAYS"]' -p escrow
// addaccount '["user2","10.51 JAYS"]' -p escrow

// vest '["JAYS"]' -p escrow

describe('escrow', () => {
  jest.setTimeout(20e3);

  const account = 'escrow';
  const symbol = 'JAYS';

  // deploy contract
  beforeAll(async () => {
    await eos.createAccount({ account });
    await eos.deploy({
      account,
      contractDir: path.join(__dirname, '..', '..', '..', 'contracts', 'escrow'),
    });
  });

  describe('addperiod', () => {
    // error states
    describe('when attempted by a user not the contract itself', () => {});
    describe('when an account already exists', () => {
      describe('and a period is added', () => {});
    });
    describe('when a period is set to 8/12', () => {
      describe('and another period is added with a different denomiator', () => {});
    });

    // success states
    describe('when a period of 2/4 has been added for four weeks ago', () => {
      beforeEach(async () => {
        await eos.sendTransaction(
          eos.createAction({
            name: 'addperiod',
            account,
            actor: account,
            data: {
              symbol_str: symbol,
              timestamp: new Date().getTime() - 1000 * 3600 * 24 * 28,
              numerator: 2,
              denominator: 4,
            },
          })
        );
      });
      describe('when a period of 1/4 has been added for a week ago', () => {
        beforeEach(async () => {
          await eos.sendTransaction(
            eos.createAction({
              name: 'addperiod',
              account,
              actor: account,
              data: {
                symbol_str: symbol,
                timestamp: new Date().getTime() - 1000 * 3600 * 24 * 7,
                numerator: 1,
                denominator: 4,
              },
            })
          );
        });
        describe('when a period of 1/4 has been added for next week', () => {
          beforeEach(async () => {
            await eos.sendTransaction(
              eos.createAction({
                name: 'addperiod',
                account,
                actor: account,
                data: {
                  symbol_str: symbol,
                  timestamp: new Date().getTime() - 1000 * 3600 * 24 * 7,
                  numerator: 1,
                  denominator: 4,
                },
              })
            );
          });
          describe('when a user1 is added with 100 tokens', () => {
            beforeEach(async () => {
              await eos.sendTransaction(
                eos.createAction({
                  name: 'addaccount',
                  account,
                  actor: account,
                  data: {
                    user: 'user1',
                    total: `100 ${symbol}`,
                  },
                })
              );
            });
            describe('when the currency balance is fetched', () => {
              let response;
              beforeEach(async () => {
                [response] = await eos.api.rpc.get_currency_balance(account, 'user1');
              });
              test('then getting their currency balance must show the correct amount', () => {
                expect(response).to.equal(`100 ${symbol}`);
              });
            });
            describe('when user2 is added with 10.51 tokens', () => {
              beforeEach(async () => {
                await eos.sendTransaction(
                  eos.createAction({
                    name: 'addaccount',
                    account,
                    actor: account,
                    data: {
                      user: 'user2',
                      total: `10.51 ${symbol}`,
                    },
                  })
                );
              });
              describe('when vest is called', () => {
                beforeEach(async () => {
                  await eos.sendTransaction(
                    eos.createAction({
                      name: 'vest',
                      account,
                      actor: account,
                      data: {
                        symbol_str: symbol,
                      },
                    })
                  );
                });
                describe('when the currency balance is fetched', () => {
                  let response;
                  beforeEach(async () => {
                    [response] = await eos.api.rpc.get_currency_balance(account, 'user1');
                  });
                  test('then getting their currency balance must show the correct amount', () => {
                    expect(response).to.equal(`100 ${symbol}`);
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
