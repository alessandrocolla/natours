import { showAlert } from "./alerts";

//type is either password or data
//data is the data object
export const updateSettings = async (type, data) => {
  const dt = { ...data };
  let options = { method: "PATCH" };
  try {
    let url = "/api/v1/users/";
    if (type === "data") {
      url += "updateMe";
      let form = new FormData();
      form.append("name", dt.name);
      form.append("email", dt.email);
      form.append("photo", dt.photo);
      options.body = form;
    } else {
      url += "updatePassword";
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(dt);
    }

    let response = await fetch(url, options);
    if (!response.ok) throw response;
    let data = await response.json();

    if (data.status === "success") {
      showAlert("success", `Updated User ${type} successfully`, 2000);
    }
  } catch (err) {
    showAlert("error", err.message || "Error updating settings");
  }
};
