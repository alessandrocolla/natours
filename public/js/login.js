/* eslint-disable */
import "core-js/stable";
import { showAlert } from "./alerts";
//import axios from "axios";

export const login = async (email, password) => {
  const req = await fetch("/api/v1/users/login", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const res = await req.json();

  if (res.status === "success") {
    // Go to homepage
    showAlert("success", "Logged in successfully!");
    window.setTimeout(() => {
      location.assign("/");
    }, 2000);
  } else showAlert("error", res.message);

  /* try {
    const res = await axios({
      method: "POST",
      url: "http://127.0.0.1:3000/api/v1/users/login",
      data: {
        email,
        password,
      },
    });

    if (res.data.status === "success") {
      alert("Logged in successfully!");
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }
  } catch (err) {
    alert(err.response.data.message);
  } */
};

export const logout = async () => {
  const req = await fetch("/api/v1/users/logout", {
    method: "GET",
  });

  const res = await req.json();
  /* console.log(res); */
  if (res.status === "success") location.assign("/");
  else showAlert("error", "Error logging out, try again.");
};
