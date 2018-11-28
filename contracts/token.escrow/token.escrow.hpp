
#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

using std::string;

namespace eosio {
class[[eosio::contract("token.escrow")]] escrow : public contract {
public:
  using contract::contract;

  [[eosio::action]] void add(string symbolStr, name user_to_whitelist);
  [[eosio::action]] void removeall(symbol sym);

  // Any functionality that you want other contracts to use must be in the
  // header file. Also, nothing in these functions can mutate the tables, that
  // is a restriction of this approach. Instead you'd have to issue an action
  // to this contract.

  bool is_user_in_whitelist(symbol sym, name user) {
    whitelist wlist(_self, sym.code().raw());

    auto it = wlist.find(user.value);

    return it != wlist.end();
  }

private:
  struct [[eosio::table]] whitelisted_users {
    name user;

    uint64_t primary_key() const { return user.value; }
  };
  typedef multi_index<name("whitelist"), whitelisted_users> whitelist;
};

} // namespace eosio
