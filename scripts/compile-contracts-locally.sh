#!/bin/bash

set -eox pipefail

eosio-cpp contracts/escrow/escrow.cpp \
  -o contracts/escrow/escrow.wasm \
  --abigen \
  -contract=escrow

# TODO
# should compile all other contracts as well
