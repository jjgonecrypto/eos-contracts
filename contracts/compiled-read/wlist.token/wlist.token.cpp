#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#include "wlist.token.hpp"

using std::string;
using namespace boost;

/**
 * An extremely watered down eosio.token contract, simply to demonstrate the
 * interaction with a separate contract that stores state we want to query at
 * runtime.
 */

namespace eosio {

void token::transfer(name from, name to, asset quantity) {
  eosio_assert(_whitelist.is_user_in_whitelist(quantity.symbol, from),
               "Only whitelisted users can transfer");

  print("OK you can transfer");
}

} // namespace eosio
EOSIO_DISPATCH(eosio::token, (transfer));
