
#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#include "token.escrow.hpp"

using std::string;
using namespace boost;

namespace eosio {

/**
 * Adds a single user to the whitelist under the scope of the symbol
 */
void escrow::add(string symbolStr, name user_to_whitelistelist) {
  require_auth(_self);

  symbol sym(symbolStr, 0);

  whitelist wlist(_self, sym.code().raw());

  wlist.emplace(_self, [&](auto &a) { a.user = user_to_whitelistelist; });
}

/**
 * Removes all users from the whitelist under the scope of the symbol
 */
void escrow::removeall(symbol sym) {
  require_auth(_self);

  whitelist wlist(_self, sym.code().raw());

  for (auto itr = wlist.begin(); itr != wlist.end();) {
    itr = wlist.erase(itr);
  }
}

} // namespace eosio
EOSIO_DISPATCH(eosio::escrow, (add)(removeall));
