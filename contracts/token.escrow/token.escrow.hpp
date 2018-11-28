
#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

using std::string;

namespace eosio {
class [[eosio::contract("token.escrow")]] escrow : public contract {
public:
  using contract::contract;
  // escrow(name receiver, name code, datastream<const char *> ds)
  //     : contract(receiver, code, ds){}

  [[eosio::action]] void add(string symbolStr, name user_to_whitelist);
  [[eosio::action]] void removeall(symbol sym);

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
