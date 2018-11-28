
#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#include "../token.escrow/token.escrow.hpp"

using std::string;

namespace eosio {
class[[eosio::contract("token")]] token : public contract {
public:
  using contract::contract;

  token(name receiver, name code, datastream<const char *> ds)
      : contract(receiver, code, ds),
        // set the instance variable _escrow to an instance of our token.escrow
        // class, so we can access its helper methods
        _escrow(escrow(name("token.escrow"), code, ds)){};

  [[eosio::action]] void transfer(name from, name to, asset quantity);

protected:
  escrow _escrow;

  // ... token tables would go here
};

} // namespace eosio
