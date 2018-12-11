#!/bin/bash

set -eox pipefail

eosio-cpp contracts/escrowed-token/escrow/escrow.cpp \
  -o contracts/escrowed-token/escrow/escrow.wasm \
  --abigen \
  -contract=escrow

eosio-cpp contracts/escrowed-token/eosio.token/eosio.token.cpp \
  -o contracts/escrowed-token/eosio.token/eosio.token.wasm \
  --abigen \
  -contract=eosio.token

# TODO
# should compile all other contracts as well
