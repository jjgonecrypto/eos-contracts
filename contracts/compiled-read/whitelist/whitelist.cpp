
#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#include "whitelist.hpp"

using std::string;

namespace eosio {

/**
 * Adds a single user to the whitelist under the scope of the symbol
 */
void whitelist::add(string symbol_str, name user) {
  require_auth(_self);

  symbol sym(symbol_str, 0);

  wlist wl(_self, sym.code().raw());

  wl.emplace(_self, [&](auto &a) { a.user = user; });
}

/**
 * Removes all users from the whitelist under the scope of the symbol
 */
void whitelist::removeall(string symbol_str) {
  require_auth(_self);

  symbol sym(symbol_str, 0);

  wlist wl(_self, sym.code().raw());

  for (auto itr = wl.begin(); itr != wl.end();) {
    itr = wl.erase(itr);
  }
}

} // namespace eosio
EOSIO_DISPATCH(eosio::whitelist, (add)(removeall));
