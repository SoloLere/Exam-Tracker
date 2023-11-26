"use strict";

const form = document.querySelector(".form");
const containerExam = document.querySelector(".exams");
const inputTime = document.querySelector(".form__input--time");
const inputDate = document.querySelector(".form__input--date");
const inputCourse = document.querySelector(".form__input--course");
const inputPrepared = document.querySelector(".form__input--prepared");
const resetBtn = document.querySelector(".btn__reset");

class Exam {
  constructor(coords, course, date, time, prepared, id) {
    this.coords = coords;
    this.course = course;
    this.date = date;
    this.time = time;
    this.prepared = prepared; // Y/N
    this._setDescription();
    this.id = id
      ? id
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.period = new Date(this.date + " " + this.time);
    this._setPopup();
  }

  _setDescription() {
    this.description = `${this.course.toUpperCase()} on ${this.date}, ${
      this.time
    }`;
  }

  _setPopup() {
    // prettier ignore
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    this.popup = `${this.course.toUpperCase()}, ${months[
      this.period.getMonth()
    ].slice(0, 3)} ${this.period.getDate()}`;
  }

  // one more logic to calculate how many days between today and my exam

  _countdown() {
    const now = new Date();
    const daysToExam = Math.trunc(
      (new Date(this.date + "T" + this.time) - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysToExam >= 1) {
      return daysToExam;
    } else if (daysToExam < 0 || Object.is(daysToExam, -0)) {
      return "Done";
    } else return "Today";
  }
}

class App {
  #map;
  #mapZoomLevel = 16;
  #mapEventLocation;
  #exams = [];
  #markers = [];
  coordinates = [7.521746046324751, 4.527285162504371];
  editID;
  editEl;

  constructor() {
    // get local storage
    this._getLocalStorage();

    this._loadMap();
    
    // toggle reset btn
    this._toggleResetbtn();

    // event handlers
    form.addEventListener("submit", this._newExam.bind(this));

    containerExam.addEventListener("click", this._moveToPopup.bind(this));

    resetBtn.addEventListener("click", this.reset);
  }

  _loadMap() {
    this.#map = L.map("map").setView(this.coordinates, this.#mapZoomLevel);

    L.tileLayer("http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on("click", this._showForm.bind(this));

    // asynchronous JS, load exams market only when the map has finished loading
    this.#exams.forEach((exam) => {
      this._renderExamMarker(exam);
    });
  }

  _newExam(e) {
    e.preventDefault();

    // validation
    const validInputs = (...inputs) => inputs.every((inp) => inp != "");

    // get data from form
    const course = inputCourse.value;
    const date = inputDate.value;
    const time = inputTime.value;
    const prep = inputPrepared.value;

    if (!validInputs(course, date, time, prep))
      return alert("Inputs cannot be empty!");

    let exam;

    if (this.editID || this.editID == 0) {
      const oldexam = this.#exams[this.editID];

      const coords = oldexam.coords;
      exam = new Exam(coords, course, date, time, prep, oldexam.id);

      // replace exam in exams array
      this.#exams.splice(this.#exams.indexOf(oldexam), 1, exam);

      // render exam in list
      this._renderExam(exam, this.#exams.indexOf(oldexam));

      // edit exam in map
      this._renderExamMarker(exam, true);

      // update local storage
      this._setLocalStorage();

      // modify editID
      this.editID = null;

      // hide form + clear input fields
      this._hideForm();

      return;
    }

    // create new exam object
    const coords = this.#mapEventLocation.latlng;
    exam = new Exam(coords, course, date, time, prep);

    // Add new exam to exams array
    this.#exams.push(exam);
  

    // render exam on map as marker
    this._renderExamMarker(exam);
    // render exam on list
    this._renderExam(exam);
    // hide form + clear input fields
    this._hideForm();
    // toggle reset btn
    this._toggleResetbtn();

    // store/update exams array in local storage
    this._setLocalStorage();
  }

  _renderExamMarker(exam, edit = false) {
    if (edit) {
      const targetMarker = this.#markers.find(
        (marker) => marker.examId == exam.id
      );

      // remove exam marker on the map
      this.#map.removeLayer(targetMarker);
    }
    const marker = L.marker(exam.coords, { draggable: false })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: ` ${
            exam.prepared === "no" ? "unprepared" : "prepared"
          }-popup`,
        })
      )
      .setPopupContent(`${exam.popup}`)
      .openPopup();

    marker.examId = exam.id;
    if (edit) {
      const targetMarkerIndex = this.#markers.findIndex(
        (marker) => marker.examId == exam.id
      );

      this.#markers.splice(targetMarkerIndex, 1, marker);
    } else this.#markers.push(marker);
  }

  _renderExam(exam, positon = false) {
    const li = document.createElement("li");
    li.className = `exam  ${
      exam.prepared === "no" ? "exam__unprepared" : "exam__prepared"
    }`;

    li.setAttribute("data-id", exam.id);

    const html = `
      <h2 class="exam__title">${exam.description}</h2>
      <div class="exam__details">
        <span class="exam__icon"> ${exam.prepared === "no" ? "😥" : "💪"}</span>
        <span class="exam__value"> ${
          exam.prepared === "no" ? "go and read" : "lets f*cking go"
        }</span>
      </div>
      <div class="exam__details">
        <span class="exam__icon">⏱</span>
        <span class="exam__value">${exam._countdown()}</span>
        <span class="exam__unit">${
          typeof exam._countdown() == "number" ? "days" : ""
        }</span>
      </div>
      <div class="icons">
          <button class="button__edit">
            <i class="fa-solid fa-pen-to-square icon__edit"></i> 
          </button>
          <button class="button__delete">
            <i class="fa-solid fa-trash icon__delete"></i>
          </button>
      </div>
    `;

    li.innerHTML = html;
    if (positon) {
      this.editEl.parentNode.replaceChild(li, this.editEl);
    } else form.insertAdjacentElement("afterend", li);
  }

  _showForm(e) {
    this.#mapEventLocation = e;
    form.classList.remove("hidden");
    inputCourse.focus();
  }

  _hideForm() {
    inputCourse.value =
      inputDate.value =
      inputTime.value =
      inputPrepared.value =
        "";
    form.classList.add("hidden");
  }

  _moveToPopup(e) {
    // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
    if (!this.#map) return;

    // check if event is for delete or edit
    if (e.target.classList.contains("icon__delete")) {
      this._deleteExam(e);
      return;
    }

    if (e.target.classList.contains("icon__edit")) {
      this._editExam(e);
      return;
    }

    // get the closest exam class
    const examEl = e.target.closest(".exam");

    if (!examEl) return;

    const target = this.#exams.find((exam) => examEl.dataset.id === exam.id);

    this.#map.setView(target.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("exams", JSON.stringify(this.#exams));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("exams"));

    if (!data) return;

    data.forEach((obj) => {
      this.#exams.push(
        new Exam(obj.coords, obj.course, obj.date, obj.time, obj.prepared)
      );
    });

    // this.#exams = data;

    this.#exams.forEach((exam) => {
      this._renderExam(exam);
    });
  }

  reset() {
    localStorage.removeItem("exams");
    location.reload();
  }

  _editExam(e) {
    this.editEl = e.target.closest(".exam");
    const target = this.#exams.findIndex(
      (exam) => this.editEl.dataset.id === exam.id
    );
    this.editID = target;

    this._showForm();
  }

  _deleteExam(e) {
    // find the clicked exam element
    const examEl = e.target.closest(".exam");

    // find the index of the exam in the exams array
    const target = this.#exams.findIndex(
      (exam) => examEl.dataset.id === exam.id
    );

    // Remove from exams array
    this.#exams.splice(target, 1);

    // update exams array in local storage
    this._setLocalStorage();

    // find exam marker in markers
    const targetMarker = this.#markers.find(
      (marker) => marker.examId == examEl.dataset.id
    );

    // remove exam marker on the map
    this.#map.removeLayer(targetMarker);

    // update markers
    this.#markers.splice(this.#markers.indexOf(targetMarker), 1);

    // remove exam from list
    examEl.remove();

    // toggle-off resetbtn when exams array is empty
    this._toggleResetbtn();
  }

  _toggleResetbtn() {
    if (this.#exams.length) resetBtn.classList.remove("hidden");
    if (!this.#exams.length) resetBtn.classList.add("hidden");
  }
}

const app = new App();
