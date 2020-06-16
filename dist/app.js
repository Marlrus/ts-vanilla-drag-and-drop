"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
//prjectStatus
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus[ProjectStatus["Active"] = 0] = "Active";
    ProjectStatus[ProjectStatus["Finished"] = 1] = "Finished";
})(ProjectStatus || (ProjectStatus = {}));
class State {
    constructor() {
        this.listeners = [];
    }
    addListener(listenerFn) {
        this.listeners.push(listenerFn);
    }
}
//project Type
class Project {
    constructor(id, title, description, people, status) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.people = people;
        this.status = status;
    }
}
//Project State Management
class ProjectState extends State {
    constructor() {
        super();
        this.projects = [];
    }
    static getInstance() {
        if (this.instance) {
            return this.instance;
        }
        this.instance = new ProjectState();
        return this.instance;
    }
    addProject(content) {
        const [title, description, people] = content;
        const newProject = new Project(Math.random().toString(), title, description, people, ProjectStatus.Active);
        this.projects.push(newProject);
        this.updateListeners();
    }
    moveProject(id, newStatus) {
        const project = this.projects.find(project => project.id === id);
        if (project && project.status !== newStatus) {
            project.status = newStatus;
            this.updateListeners();
        }
    }
    updateListeners() {
        for (const listenerFn of this.listeners) {
            listenerFn(this.projects.slice());
        }
    }
}
//global instance of state
const projectState = ProjectState.getInstance();
function validate(input) {
    let isValid = true;
    //check not empty
    if (input.required) {
        isValid = isValid && input.value.toString().trim().length !== 0;
    }
    //check minlength for string inputs
    if (input.minLength != null &&
        typeof input.value === 'string') {
        isValid =
            isValid && input.value.length >= input.minLength;
    }
    if (input.maxLength != null &&
        typeof input.value === 'string') {
        isValid =
            isValid && input.value.length >= input.maxLength;
    }
    if (input.min != null &&
        typeof input.value === 'number') {
        isValid = isValid && input.value >= input.min;
    }
    if (input.max != null &&
        typeof input.value === 'number') {
        isValid = isValid && input.value <= input.max;
    }
    return isValid;
}
//autobind Decorator
function autobind(_, _2, descriptor) {
    // console.log(descriptor)
    const targetMethod = descriptor.value;
    // console.log(targetMethod)
    const adjustedDescriptor = {
        //already set to true in our default descriptor
        // configurable: true,
        get() {
            const boundFunction = targetMethod.bind(this);
            return boundFunction;
        }
    };
    return adjustedDescriptor;
}
//===========
//Classes
//===========
//component base class
class Component {
    constructor(templateId, hostElementId, insertAtBeginning, newElementId) {
        this.templateElement = document.getElementById(templateId);
        this.hostElement = document.getElementById(hostElementId);
        const importedHTML = document.importNode(this.templateElement.content, true);
        this.element = importedHTML.firstElementChild;
        if (newElementId) {
            this.element.id = newElementId;
        }
        this.attach(insertAtBeginning);
    }
    attach(insertAtBeginning) {
        this.hostElement.insertAdjacentElement(insertAtBeginning ? 'afterbegin' : 'beforeend', this.element);
    }
}
//prject list item class
class ProjectItem extends Component {
    constructor(hostId, project) {
        super('single-project', hostId, false, project.id);
        this.project = project;
        this.configure();
        this.renderContent();
    }
    get persons() {
        return this.project.people === 1 ?
            '1 Person' :
            `${this.project.people} People`;
    }
    dragStartHandler(event) {
        event.dataTransfer.setData('text/plain', this.project.id);
        event.dataTransfer.effectAllowed = 'move';
    }
    dragEndHandler(_) {
        console.log('DragEnd');
    }
    configure() {
        this.element.addEventListener('dragstart', this.dragStartHandler);
        this.element.addEventListener('dragend', this.dragEndHandler);
    }
    renderContent() {
        this.element.querySelector('h2').textContent = this.project.title;
        this.element.querySelector('h3').textContent = this.persons + ' assigned.';
        this.element.querySelector('p').textContent = this.project.description;
    }
}
__decorate([
    autobind
], ProjectItem.prototype, "dragStartHandler", null);
__decorate([
    autobind
], ProjectItem.prototype, "dragEndHandler", null);
//project list class
class ProjectList extends Component {
    constructor(type) {
        super('project-list', 'app', false, `${type}-projects`);
        this.type = type;
        this.assignedProjects = [];
        this.configure();
        this.renderContent();
    }
    dragOverHandler(event) {
        var _a;
        if (((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.types[0]) === 'text/plain') {
            event.preventDefault();
            const liElement = this.element.querySelector('ul');
            liElement.classList.add('droppable');
        }
    }
    dropHandler(event) {
        const projectId = event.dataTransfer.getData('text/plain');
        projectState.moveProject(projectId, this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished);
    }
    dragLeaveHandler(_) {
        const liElement = this.element.querySelector('ul');
        liElement.classList.remove('droppable');
    }
    configure() {
        this.element.addEventListener('dragover', this.dragOverHandler);
        this.element.addEventListener('drop', this.dropHandler);
        this.element.addEventListener('dragleave', this.dragLeaveHandler);
        projectState.addListener(this.assignProjects);
    }
    renderContent() {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector('ul').id = listId;
        this.element.querySelector('h2').textContent = this.type.toUpperCase() + ' PROJECTS';
    }
    //Listener
    assignProjects(projects) {
        //filter active projects
        const compatibleProjects = projects.filter(project => {
            return this.type === 'active' ?
                project.status === ProjectStatus.Active :
                project.status === ProjectStatus.Finished;
        });
        this.assignedProjects = compatibleProjects;
        this.renderProjects();
    }
    renderProjects() {
        const ulElement = document.getElementById(`${this.type}-projects-list`);
        //clear all list items. 
        ulElement.innerHTML = "";
        //render the projects
        for (const project of this.assignedProjects) {
            new ProjectItem(this.element.querySelector('ul').id, project);
        }
    }
}
__decorate([
    autobind
], ProjectList.prototype, "dragOverHandler", null);
__decorate([
    autobind
], ProjectList.prototype, "dropHandler", null);
__decorate([
    autobind
], ProjectList.prototype, "dragLeaveHandler", null);
__decorate([
    autobind
], ProjectList.prototype, "assignProjects", null);
//Project input class
class ProjectInput extends Component {
    constructor() {
        super('project-input', 'app', true, 'user-input');
        //============================
        //populate input elements
        //============================
        //select input elements
        this.titleInputElement = this.element.querySelector('#title');
        this.descriptionInputElement = this.element.querySelector('#description');
        this.peopleInputElement = this.element.querySelector('#people');
        //============================
        //Listen to our form
        //============================
        //add a listener
        this.configure();
    }
    //add listener to form submission
    configure() {
        //use submitHandler() as the callback
        this.element.addEventListener('submit', this.submitHandler);
    }
    renderContent() { }
    gatherUserInput() {
        const titleValue = this.titleInputElement.value;
        const descriptionValue = this.descriptionInputElement.value;
        const peopleValue = this.peopleInputElement.value;
        //validation conditions (V1)
        //Create validatable object
        const titleValidatable = {
            value: titleValue,
            required: true
        };
        const descriptionValidatable = {
            value: descriptionValue,
            required: true,
            minLength: 5
        };
        const peopleValidatable = {
            value: +peopleValue,
            required: true,
            min: 1,
            max: 5
        };
        if (validate(titleValidatable) &&
            validate(descriptionValidatable) &&
            validate(peopleValidatable)) {
            return [titleValue, descriptionValue, +peopleValue];
        }
        else {
            alert('Invalid input, please try again!');
            return;
        }
    }
    //clearinputs after submission
    clearInputs() {
        this.titleInputElement.value = "";
        this.descriptionInputElement.value = "";
        this.peopleInputElement.value = "";
    }
    submitHandler(event) {
        //prevent default form submission
        event.preventDefault();
        //gatehr info from inputs
        const userInput = this.gatherUserInput();
        if (Array.isArray(userInput)) {
            // const [title, description, people] = userInput
            projectState.addProject(userInput);
            this.clearInputs();
        }
    }
}
__decorate([
    autobind
], ProjectInput.prototype, "submitHandler", null);
const projectInput = new ProjectInput();
const projectList = new ProjectList('active');
const finishedProjectList = new ProjectList('finished');
