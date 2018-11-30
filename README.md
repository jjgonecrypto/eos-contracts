# EOS Contracts

A collection of EOS smart contracts that interact with each other. This is meant purely as a proof of concept for contract interaction on EOS.

## Preparation

- Make sure you have `eosio-cpp` available on your path (by installing eosio.cdt), and you have `cleos` on your path (that is either using a local `nodeos` and `keods` or remote ones.)

## Examples

- [Compiled-Read](./contracts/compiled-read) is an example of a contract where it can read the table state of a another already-deployed contract by being compiled with the same source file.
