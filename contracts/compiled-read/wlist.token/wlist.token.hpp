#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#include "../whitelist/whitelist.hpp"

using std::string;

namespace eosio {
class [[eosio::contract("wlist.token")]] token : public contract {
public:
  using contract::contract;

  token(name receiver, name code, datastream<const char *> ds)
      : contract(receiver, code, ds),
        // set the instance variable _whitelist to an instance of our whitelist
        // class, so we can access its helper methods
        // ensure that it is invoked with "self" as the whitelist name - this
        // should match the account the whitelist contract is deployed under
        _whitelist(whitelist(name("whitelist"), code, ds)){};

  [[eosio::action]] void transfer(name from, name to, asset quantity);

protected:
  whitelist _whitelist;

  // ... token tables would go here
};

} // namespace eosio
