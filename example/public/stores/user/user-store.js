class UserStore {

  constructor() {
    this.handlers = {
      setUser: 'CREATE_USER'
    };
  }

  setUser(user) {
    //set user
    this.state = user;
  }

  getUser() {
    this.fetch()
  }
}