importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB_9e3TvUe0heERlYBQgGth2EMkw9WcAb8",
  projectId: "ticket-notification-system",
  messagingSenderId: "56800812161",
  appId: "1:56800812161:web:3cf1a90d9b4d0ad0950180"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/assets/icon.png"
  });

});