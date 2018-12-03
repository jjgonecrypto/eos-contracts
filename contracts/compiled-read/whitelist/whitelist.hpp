#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

using std::string;

namespace eosio {

class [[eosio::contract("whitelist")]] whitelist : public contract {
public:
  using contract::contract;

  [[eosio::action]] void add(string symbol_str, name user);
  [[eosio::action]] void removeall(string symbol_str);

  bool is_user_in_whitelist(symbol sym, name user) {
    wlist wl(_self, sym.code().raw());

    auto it = wl.find(user.value);

    return it != wl.end();
  }

private:
  struct [[eosio::table]] whitelisted_users {
    name user;

    uint64_t primary_key() const { return user.value; }
  };
  typedef multi_index<name("whitelist"), whitelisted_users> wlist;
};

} // namespace eosio
