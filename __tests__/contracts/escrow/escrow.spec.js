"use strict";

const expect = require("chai").expect;
const path = require("path");
const eos = require("eosjs-node").connect({ url: "http://127.0.0.1:7777" });

// describe('escrow', () => {
//   jest.setTimeout(20e3);

//   const account = 'token.test.1';

//   // deploy contract
//   beforeAll(async () => {
//     await eos.createAccount({ account });
//     await eos.deploy({
//       account,
//       contract: 'eosio.token',
//       contractDir: path.join(__dirname, '..', 'build'),
//     });
//   });

//   describe('create action', () => {
//     const maxSupply = '100';
//     const decimals = '000';
//     const max = `${maxSupply}.${decimals}`;
//     // using the same symbol as a pre-existing one will fail
//     // (once the preexiting one is committed to the blockchain)
//     const symbol = 'TESTSXE';
//     const reNumDecimals = new RegExp(`\\.0{${decimals.length}}\\s`);

//     describe(`when creating ${max} ${symbol}`, () => {
//       let response;
//       beforeAll(async () => {
//         const createTokenAction = eos.createAction({
//           name: 'create',
//           account,
//           actor: account,
//           data: { maximum_supply: `${max} ${symbol}`, issuer: 'eosio' },
//         });

//         await eos.sendTransaction(createTokenAction);

//         response = (await eos.api.rpc.get_currency_stats(account, symbol))[symbol];
//       });

//       test('then the currency stats are available', () => {
//         expect(response).to.be.an('object');
//       });

//       test('and the issuer is eosio', () => {
//         expect(response.issuer).to.equal('eosio');
//       });

//       test('and the supply is empty', () => {
//         expect(response.supply).to.match(/^0\./);
//       });

//       test('with the correct number of decimals', () => {
//         expect(response.supply).to.match(reNumDecimals);
//       });

//       test('and the max supply is correct', () => {
//         expect(response.max_supply).to.match(new RegExp(`^${maxSupply}\\.`));
//       });

//       test('with the correct number of decimals', () => {
//         expect(response.max_supply).to.match(reNumDecimals);
//       });
//     });
//   });
// });
