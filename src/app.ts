//drag and drop interfaces
interface Draggable {
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
    dragOverHandler(event: DragEvent): void;
    dropHandler(event: DragEvent): void;
    dragLeaveHandler(event: DragEvent): void;
}

//prjectStatus
enum ProjectStatus{
    Active, Finished
}

class State <T>{
    protected listeners: Listener<T>[] = []; 

    addListener(listenerFn: Listener<T>){
        this.listeners.push(listenerFn)
    }
}

//project Type
class Project {
    constructor(
        public id: string,
        public title: string,
        public description: string,
        public people: number,
        public status: ProjectStatus
    ){}
}

//listener type
type Listener<T> = (projects: T[]) => void;

//Project State Management
class ProjectState extends State <Project>{
    private projects: Project[] = [];
    private static instance: ProjectState;

    private constructor() {
        super()
    }

    static getInstance(){
        if(this.instance){
            return this.instance
        }
        this.instance = new ProjectState();
        return this.instance;
    }

    addProject(content: ValidInput){
        const [title,description,people] = content
        const newProject = new Project(
            Math.random().toString(), 
            title, 
            description, 
            people, 
            ProjectStatus.Active
        )
        this.projects.push(newProject)
        this.updateListeners()
    }

    moveProject(id: string, newStatus: ProjectStatus) {
        const project = this.projects.find(project => project.id === id)
        if(project && project.status !== newStatus){ 
            project.status = newStatus
            this.updateListeners()
        }
    }

    private updateListeners(){
        for(const listenerFn of this.listeners){
            listenerFn(this.projects.slice())
        }
    }
}

//global instance of state
const projectState = ProjectState.getInstance()

//validation logic
interface Validatable {
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

type ValidInput = [string,string,number]

function validate(input: Validatable){
    let isValid = true;
    //check not empty
    if(input.required){
        isValid = isValid && input.value.toString().trim().length !== 0;
    }
    //check minlength for string inputs
    if(input.minLength != null && 
        typeof input.value === 'string'
    ){
        isValid = 
            isValid && input.value.length >= input.minLength;
    }
    if(input.maxLength != null && 
        typeof input.value === 'string'
    ){
        isValid = 
            isValid && input.value.length >= input.maxLength;
    }
    if(input.min != null &&
        typeof input.value === 'number'
    ){
        isValid = isValid && input.value >= input.min
    }
    if(input.max != null &&
        typeof input.value === 'number'
    ){
        isValid = isValid && input.value <= input.max
    }
    return isValid;
}

//autobind Decorator
function autobind(
    _: any, 
    _2: string, 
    descriptor: PropertyDescriptor
){
    // console.log(descriptor)
    const targetMethod = descriptor.value;
    // console.log(targetMethod)
    const adjustedDescriptor: PropertyDescriptor = {
        //already set to true in our default descriptor
        // configurable: true,
        get(){
            const boundFunction = targetMethod.bind(this)
            return boundFunction
        }
    }
    return adjustedDescriptor
}

//===========
//Classes
//===========

//component base class
abstract class Component <T extends HTMLElement, U extends HTMLElement>{
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(
        templateId: string, 
        hostElementId: string, 
        insertAtBeginning: boolean,
        newElementId?: string
    ){
        this.templateElement = document.getElementById(
            templateId
        ) as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostElementId) as T;
        const importedHTML = document.importNode(this.templateElement.content, true)
        this.element = importedHTML.firstElementChild as U;
        if(newElementId){
            this.element.id = newElementId
        }

        this.attach(insertAtBeginning)
    }

    private attach(insertAtBeginning: boolean){
        this.hostElement.insertAdjacentElement(
            insertAtBeginning? 'afterbegin' : 'beforeend',
            this.element
        )
    }

    protected abstract configure():void;
    protected abstract renderContent(): void;
}

//prject list item class
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> 
    implements Draggable{
    private project: Project;

    get persons() {
        return this.project.people === 1?
            '1 Person':
            `${this.project.people} People`
    }

    constructor(hostId: string, project: Project){
        super('single-project',hostId, false ,project.id);
        this.project = project
        this.configure()
        this.renderContent()
    }
    
    @autobind
    dragStartHandler(event: DragEvent){
        event.dataTransfer!.setData('text/plain',this.project.id)
        event.dataTransfer!.effectAllowed = 'move'
    }
    
    @autobind
    dragEndHandler(_: DragEvent){
        console.log('DragEnd')
    }

    protected configure(){
        this.element.addEventListener('dragstart',this.dragStartHandler)
        this.element.addEventListener('dragend',this.dragEndHandler)
    }

    protected renderContent(){
        this.element.querySelector('h2')!.textContent = this.project.title
        this.element.querySelector(
            'h3'
        )!.textContent = this.persons + ' assigned.'
        this.element.querySelector('p')!.textContent = this.project.description
    }
}

//project list class
class ProjectList extends Component<HTMLDivElement, HTMLElement>
    implements DragTarget {
    assignedProjects: Project[] = [];

    constructor(private type: 'active' | 'finished'){
        super('project-list','app', false, `${type}-projects`)
        
        this.configure()
        this.renderContent()
    }

    @autobind
    dragOverHandler(event: DragEvent){
        if(event.dataTransfer?.types[0] === 'text/plain'){
            event.preventDefault()
            const liElement = this.element.querySelector('ul')!
            liElement.classList.add('droppable')
        }
    }

    @autobind
    dropHandler(event: DragEvent){
        const projectId = event.dataTransfer!.getData('text/plain')
        projectState.moveProject(
            projectId,
            this.type === 'active'? ProjectStatus.Active : ProjectStatus.Finished
        )
    }

    @autobind
    dragLeaveHandler(_: DragEvent) {
        const liElement = this.element.querySelector('ul')!
        liElement.classList.remove('droppable')
    }

    protected configure() {
        this.element.addEventListener('dragover',this.dragOverHandler)
        this.element.addEventListener('drop',this.dropHandler)
        this.element.addEventListener('dragleave',this.dragLeaveHandler)
        projectState.addListener(this.assignProjects)
    }

    protected renderContent(){
        const listId = `${this.type}-projects-list`
        this.element.querySelector('ul')!.id = listId
        this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + ' PROJECTS'
    }
    //Listener
    @autobind
    private assignProjects(projects: Project[]){
        //filter active projects
        const compatibleProjects = projects.filter(project => {
            return this.type === 'active'?
                project.status === ProjectStatus.Active :
                project.status === ProjectStatus.Finished
        })
        this.assignedProjects = compatibleProjects;
        this.renderProjects()
    }

    private renderProjects(){
        const ulElement = document.getElementById(`${this.type}-projects-list`) as HTMLUListElement
        //clear all list items. 
        ulElement.innerHTML = ""
        //render the projects
        for (const project of this.assignedProjects){
            new ProjectItem(this.element.querySelector('ul')!.id,project)
        }
    }
}

//Project input class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement>{
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;

    constructor(){
        super('project-input', 'app', true, 'user-input')
        //============================
        //populate input elements
        //============================
        //select input elements
        this.titleInputElement = this.element.querySelector(
            '#title'
        ) as HTMLInputElement;
        this.descriptionInputElement = this.element.querySelector(
            '#description'
        ) as HTMLInputElement;
        this.peopleInputElement = this.element.querySelector(
            '#people'
        ) as HTMLInputElement;
        
        //============================
        //Listen to our form
        //============================
        //add a listener
        this.configure()
    }
    //add listener to form submission
    protected configure(){
        //use submitHandler() as the callback
        this.element.addEventListener('submit', this.submitHandler)
    }

    protected renderContent() {}

    private gatherUserInput(): ValidInput | void{
        const titleValue = this.titleInputElement.value;
        const descriptionValue = this.descriptionInputElement.value;
        const peopleValue = this.peopleInputElement.value;
        //validation conditions (V1)
        //Create validatable object
        const titleValidatable: Validatable ={
            value: titleValue,
            required: true
        }
        const descriptionValidatable: Validatable ={
            value: descriptionValue,
            required: true,
            minLength: 5
        }
        const peopleValidatable: Validatable ={
            value: +peopleValue,
            required: true,
            min: 1,
            max: 5
        }

        if(
            validate(titleValidatable) && 
            validate(descriptionValidatable) &&
            validate(peopleValidatable) 
        ) {
            return [titleValue, descriptionValue, +peopleValue]
        }else{
            alert('Invalid input, please try again!')
            return;
        }
    }

    //clearinputs after submission
    private clearInputs(){
        this.titleInputElement.value = ""
        this.descriptionInputElement.value = ""
        this.peopleInputElement.value = ""
    }

    @autobind
    private submitHandler(event: Event){
        //prevent default form submission
        event.preventDefault()
        //gatehr info from inputs
        const userInput = this.gatherUserInput()
        if(Array.isArray(userInput)){
            // const [title, description, people] = userInput
            projectState.addProject(userInput)
            this.clearInputs()
        }
    }
}

const projectInput = new ProjectInput()
const projectList = new ProjectList('active')
const finishedProjectList = new ProjectList('finished')
