## 0.3.0

Changed the way we handle sessions in our controller. Namely, your APIs can be hit, even if the request does not have a session. To mitigate this, if you are going to use a session, you must make sure that the session exists for every requests. This can be done easily through middleware.