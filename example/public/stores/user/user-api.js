class UserApi {
  createUser(user) {
    this.post('/user', user);
  }
}