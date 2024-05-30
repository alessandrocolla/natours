/* eslint-disable */
import { displayMap } from "./mapbox";
import { login, logout } from "./login";
import { updateSettings } from "./updateSettings";
import { bookTour } from "./stripe";
import { showAlert } from "./alerts";

// DOM ELEMENTS
const mapBox = document.getElementById("map");
const loginForm = document.querySelector(".form--login");
const logOutBtn = document.querySelector(".nav__el--logout");
const userDataForm = document.querySelector(".form-user-data");
const userPswForm = document.querySelector(".form-user-password");
const bookBtn = document.getElementById("book-tour");

// VALUES

//Mappa per ogni tour
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  //Autenticazione login
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });
}

if (logOutBtn) logOutBtn.addEventListener("click", logout);

if (userDataForm) {
  userDataForm.addEventListener("submit", async function (e) {
    if (!e.target.classList.contains("form-user-data")) {
      return;
    }
    e.preventDefault();
    document.querySelector(".btn--green").textContent = "UPDATING...";
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const photo = document.getElementById("photo").files[0];
    await updateSettings("data", { name, email, photo });
    document.querySelector(".btn--green").textContent = "SAVE SETTINGS";
    location.reload(true);
  });
}

if (userPswForm) {
  userPswForm.addEventListener("submit", async function (e) {
    // guard to check if different form submitted
    if (!e.target.classList.contains("form-user-settings")) {
      return;
    }
    e.preventDefault();
    document.querySelector(".btn--save-password").textContent = "UPDATING...";
    const oldPassword = document.getElementById("password-current").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;
    await updateSettings("password", {
      oldPassword,
      password,
      passwordConfirm,
    });

    document.querySelector(".btn--save-password").textContent = "SAVE PASSWORD";
    document.getElementById("password-current").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
  });
}

if (bookBtn) {
  bookBtn.addEventListener("click", (e) => {
    e.target.textContent = "Processing...";
    const { tourId } = e.target.dataset;

    bookTour(tourId);
  });
}

const alertMessage = document.querySelector("body").dataset.alert;
if (alertMessage) showAlert("success", alertMessage, 20);
