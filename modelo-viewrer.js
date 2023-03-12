import { Color, LineBasicMaterial, MeshBasicMaterial} from "three";
import { IfcViewerAPI } from "web-ifc-viewer";
import { proyectos } from "./proyectos.js";
import { ifcTraducidoEsp } from "./ifcTranslate";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

//ELEMENTOS HTML
const pageTitle = document.querySelector("title");
const projectName = document.getElementById("nombreModelo");

//MENU BOTON DERECHO
const contextMenu = document.querySelector(".wrapper");
const shareMenu = contextMenu.querySelector(".annotation-menu");

//CONTENEDORES DE INFORMACION
const progressContainer = document.getElementById("progress-container");
const container = document.getElementById("viewrer-container");
const menuHtml = document.getElementById("ifc-property-menu");
const propMenu = document.createElement("div");
const propContent = document.createElement("div");
const floorContainer = document.getElementById("floor-container");
const treeContainer = document.getElementById("tree-container");
const checkboxesOfType = document.getElementById("checkbox-category");
const complexCheckboxes = document.getElementById("checkbox-category-levels");
const timeContainer = document.getElementById("checkbox-time");
const calculatorContainer = document.getElementById("volum-calculator");

//BOTONES
const exitButton = document.getElementById("exit-button");
const selectButton = document.getElementById("select-button");
const clippingButton = document.getElementById("clipping-button");
const extendButton = document.getElementById("extends-button");
const planFloorButton = document.getElementById("plan-floor-button");
const treeButton = document.getElementById("tree-button");
const spatialButton = document.getElementById("visibility-complex-button");
const timeButton = document.getElementById("crono-button");
const dimButton = document.getElementById("measure-button");
const calcVolumButton = document.getElementById("calculator-button");
const visionButton = document.getElementById("visibility-button");
const excelButton = document.getElementById("excel-button");
const searchButton = document.getElementById("search-button");
const fristPersonButton = document.getElementById("frist-person-button");
const saveAnnotationButton = document.getElementById("save-annotation");

//CONFIGURACION DE LA ESCENA Y SUS ELEMENTOS
const viewer = await setupScene();
setupMultiThreading();
setupProgressNotification();
const scene = viewer.context.getScene();

//CARGA DEL MODELO
const modelURL = setupProject()[1];
const modelName = setupProject()[0];
const model = await viewer.IFC.loadIfcUrl(modelURL, true);
const subsetOfModel = await visualSetup();

//MAPEO INICIAL DE PROPIEDADES
//postprocessingPorperties();
let modelProperties;
await loadProperties();
const propertyValues = loadPropertiesValues(modelProperties)
const psets = getAllPsets();
const treeStructure = await viewer.IFC.getSpatialStructure(model.modelID);
const categorySubsets={};
const categoryPerLevelSubsets={};
const dateSubsets={};
const ifcTypes = returnTypesOfElements();

//PROPIEDADES SACEEM
const saceemPsets = getAllSaceem(psets);
const saceemParams = getAllSaceemParameters(saceemPsets);
const saceemTypes = getAllSaceemTypes(saceemParams);
const saceemIds = getAllSaceemIds(saceemParams);
const saceemConcreteDates = getAllSaceemConcreteDates(saceemParams);
const saceemAssembyDates = getAllSaceemAssemblyDates(saceemParams);
const saceemVolumns = getAllSaceemQuantities(saceemParams);
const presacStatus = getAllSaceemProcedences(saceemParams);

//CONFIGURACIÓN BOTONES
let activeSelection = false;
let activeSearching = false;
let clippingPlaneActive = false;
let planFloorActive = false;
let treeActive = false;
let specialVisionActive = false;
let spatialVisionActive = false;
let timeVisionActive = false;
let dimActive = false;
let calcActive = false;
let calcGroup = [];
let totalVolum
let annotations = [];
let fristPersonActive = false;

exitButton.onclick = () => {
  virtualLink("./index.html");
};

selectButton.onclick = () => {
  activeSelection = !activeSelection;
  if (activeSelection) {
    selectButton.classList.add("active-button");
    menuHtml.appendChild(propMenu);
    menuHtml.appendChild(propContent);
  } else {
    selectButton.classList.remove("active-button");
    removeAllChildren(menuHtml);
    menuHtml.classList.remove("ifc-property-menu");
    viewer.IFC.selector.unpickIfcItems();
  }
};

searchButton.onclick = async () => {
  activeSearching = !activeSearching;
  if(activeSearching){
    searchButton.classList.add("active-button");
    const searchMessage = window.prompt("Ingresa el ID del elemento:");
    const itemId = elementIdFromSaceem(searchMessage);
    const result = {
      modelID: model.modelID,
      id: itemId
    }
    menuHtml.appendChild(propMenu);
    menuHtml.appendChild(propContent);
    propertiesPanel(result);
    await viewer.IFC.selector.highlightIfcItemsByID(model.modelID,[itemId],true);
  }else{
    searchButton.classList.remove("active-button");
    removeAllChildren(menuHtml);
    menuHtml.classList.remove("ifc-property-menu");
    viewer.IFC.selector.unHighlightIfcItems();
  }
}

clippingButton.onclick = () => {
  clippingPlaneActive = !clippingPlaneActive;
  if (clippingPlaneActive) {
    clippingButton.classList.add("active-button");
    viewer.clipper.active = clippingPlaneActive;
    lockButtons([planFloorButton,treeButton,visionButton,spatialButton,timeButton,dimButton,calcVolumButton],true);
  } else {
    clippingButton.classList.remove("active-button");
    viewer.clipper.deleteAllPlanes();
    lockButtons([planFloorButton,treeButton,visionButton,spatialButton,timeButton,dimButton,calcVolumButton],false);
  }
};

extendButton.onclick = () => {
  viewer.context.ifcCamera.cameraControls.fitToSphere(model, true);
};

fristPersonButton.onclick = () => {
  fristPersonActive = !fristPersonActive;
  if(fristPersonActive){
    fristPersonButton.classList.add("active-button");
    viewer.context.ifcCamera.setNavigationMode(1);
  }else{
    viewer.context.ifcCamera.setNavigationMode(0);
    viewer.context.ifcCamera.cameraControls.setOrbitPoint(0,0,0);
    fristPersonButton.classList.remove("active-button");
  }
}

planFloorButton.onclick = () => {
  planFloorActive = !planFloorActive;
  if (planFloorActive) {
    planFloorButton.classList.add("active-button");
    floorContainer.style.zIndex=2;
    loadPlans(model.modelID);
    lockButtons([clippingButton,treeButton,visionButton,spatialButton,timeButton,calcVolumButton],true);
  } else {
    viewer.plans.exitPlanView();
    viewer.edges.toggle("bordes", false);
    //togglePostProduction(true);
    planFloorButton.classList.remove("active-button");
    floorContainer.style.zIndex=0;
    removeAllChildren(floorContainer);
    lockButtons([clippingButton,treeButton,visionButton,spatialButton,timeButton,calcVolumButton],false);
  }
};

treeButton.onclick = async () => {
  treeActive = !treeActive;
  if (treeActive) {
    treeButton.classList.add("active-button");
    treeContainer.style.zIndex=2;
    viewer.IFC.selector.fadeAwayModels();
    createIFCStructureTree(treeContainer);
    lockButtons([clippingButton,planFloorButton,visionButton,spatialButton,timeButton,calcVolumButton],true);
  } else {
    treeButton.classList.remove("active-button");
    viewer.IFC.selector.unHighlightIfcItems();
    removeAllChildren(menuHtml);
    menuHtml.classList.remove("ifc-property-menu");
    treeContainer.style.zIndex=0;
    removeAllChildren(treeContainer);
    lockButtons([clippingButton,planFloorButton,visionButton,spatialButton,timeButton,calcVolumButton],false);
  }
};

visionButton.onclick = async () => {
  specialVisionActive = !specialVisionActive;
  if (specialVisionActive) {
    visionButton.classList.add("active-button");
    checkboxesOfType.style.zIndex=2;
    subsetOfModel.removeFromParent();
    togglePickable(subsetOfModel, false);
    await createCheckBoxStructure();
    lockButtons([clippingButton,planFloorButton,treeButton,spatialButton,timeButton,calcVolumButton],true);
  } else {
    for(let subset in categorySubsets){
      categorySubsets[subset].removeFromParent();
      togglePickable(categorySubsets[subset], false);
    }
    scene.add(subsetOfModel);
    togglePickable(subsetOfModel, true);
    visionButton.classList.remove("active-button");
    checkboxesOfType.style.zIndex=0;
    removeAllChildren(checkboxesOfType);
    lockButtons([clippingButton,planFloorButton,treeButton,spatialButton,timeButton,calcVolumButton],false);
  }
};

spatialButton.onclick = () => {
  spatialVisionActive = !spatialVisionActive;
  if (spatialVisionActive) {
    spatialButton.classList.add("active-button");
    complexCheckboxes.style.zIndex=2;
    subsetOfModel.removeFromParent();
    togglePickable(subsetOfModel, false);
    createComplexCheckBoxStructure(complexCheckboxes);
    lockButtons([clippingButton,planFloorButton,treeButton,visionButton,timeButton,calcVolumButton],true);
  } else {
    for(let subset in categoryPerLevelSubsets){
      categoryPerLevelSubsets[subset].removeFromParent();
      togglePickable(categoryPerLevelSubsets[subset], false);
    }
    scene.add(subsetOfModel);
    togglePickable(subsetOfModel, true);
    spatialButton.classList.remove("active-button");
    complexCheckboxes.style.zIndex=0;
    removeAllChildren(complexCheckboxes);
    lockButtons([clippingButton,planFloorButton,treeButton,visionButton,timeButton,calcVolumButton],false);
  }
};

timeButton.onclick = () => {
  timeVisionActive = !timeVisionActive;
  if (timeVisionActive) {
    timeButton.classList.add("active-button");
    timeContainer.style.zIndex=2;
    subsetOfModel.removeFromParent();
    togglePickable(subsetOfModel, false);
    createTimeCheckBoxStructure(timeContainer);
    lockButtons([clippingButton,planFloorButton,treeButton,visionButton,spatialButton,calcVolumButton],true);
  } else {
    for(let subset in dateSubsets){
      if (dateSubsets[subset]){
        dateSubsets[subset].removeFromParent();
      }
      togglePickable(dateSubsets[subset], false);
    }
    scene.add(subsetOfModel);
    togglePickable(subsetOfModel, true);
    timeContainer.style.zIndex=0;
    removeAllChildren(timeContainer);
    timeButton.classList.remove("active-button");
    lockButtons([clippingButton,planFloorButton,treeButton,visionButton,spatialButton,calcVolumButton],false);
  }
};

dimButton.onclick = () => {
  dimActive = !dimActive;
  if (dimActive) {
    dimButton.classList.add("active-button");
    activeDimensions(true);    
  } else {
    dimButton.classList.remove("active-button");
    viewer.dimensions.delete();
    activeDimensions(false);
  }
};

calcVolumButton.onclick = () => {
  calcActive = !calcActive;
  if (calcActive) {
    calcVolumButton.classList.add("active-button");
    createCalculatorStructure(calculatorContainer);
    calculatorContainer.style.zIndex=2;
    excelButton.style.display = "initial";
    lockButtons([clippingButton,planFloorButton,treeButton,visionButton,spatialButton,timeButton,dimButton],true);
  } else {
    calcVolumButton.classList.remove("active-button");
    calculatorContainer.style.zIndex=0;
    removeAllChildren(calculatorContainer);
    calcGroup = [];
    totalVolum = 0;
    excelButton.style.display = "none";
    lockButtons([clippingButton,planFloorButton,treeButton,visionButton,spatialButton,timeButton,dimButton],false);
  }
};

excelButton.onclick = () => {
  const table = document.getElementById("volum-table");
  const book = XLSX.utils.table_to_book(table);
  XLSX.writeFile(book, `${modelName}_Volumenes.xlsx`);
}

//CONFIGURACIÓN EVENTOS
window.onmousemove = async () => await viewer.IFC.selector.prePickIfcItem();

window.ondblclick = async () => {
  if (activeSelection) {
    const result = await viewer.IFC.selector.pickIfcItem(true);
    propertiesPanel(result);
  }
  if (clippingPlaneActive) {
    viewer.clipper.createPlane();
  }
  if (dimActive) {
      viewer.dimensions.create();
  }
  if (calcActive) {
    const result = await viewer.IFC.selector.pickIfcItem();
    newValue("volum-table-body",result.id);
    calcGroup.push(result.id);
    totalVolum = parseFloat(totalCalculator(calcGroup)).toFixed(2);
    totalPrint(totalVolum);
  }
};

window.onkeydown = (event) => {
  if (event.code === "Delete" && clippingPlaneActive) {
    viewer.clipper.deletePlane();
  }
  if(event.code==="Escape" &&  dimActive){
    viewer.dimensions.delete();
  }

};

//Acciones a tomar al hacer click en boton derecho. Fuente menú contextual: https://www.codingnepalweb.com/right-click-context-menu-html-javascript/
let rigthClickResult;
window.addEventListener("contextmenu", async (e) => {
  e.preventDefault();
  let x = e.offsetX,
    y = e.offsetY,
    winWidth = window.innerWidth,
    winHeight = window.innerHeight,
    cmWidth = contextMenu.offsetWidth,
    cmHeight = contextMenu.offsetHeight;

  if (x > winWidth - cmWidth - shareMenu.offsetWidth) {
    shareMenu.style.left = "-200px";
  } else {
    shareMenu.style.left = "";
    shareMenu.style.right = "-200px";
  }

  x = x > winWidth - cmWidth ? winWidth - cmWidth - 5 : x;
  y = y > winHeight - cmHeight ? winHeight - cmHeight - 5 : y;

  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  //contextMenu.style.visibility = "visible";
  contextMenu.style.display = "unset";

  rigthClickResult = viewer.context.castRayIfc();
  const hideElement = document.getElementById("hide-element");
  const isolateElement = document.getElementById("isolate-element");
  const newAnnotation = document.getElementById("new-annotation");
  if (rigthClickResult === null){
    hideElement.classList.add("option-close");
    isolateElement.classList.add("option-close");
    newAnnotation.classList.add("option-close");
  } else {
    hideElement.classList.remove("option-close");
    isolateElement.classList.remove("option-close");
    newAnnotation.classList.remove("option-close");  
  }
});

document.addEventListener("click", async (e) => {
  //contextMenu.style.visibility = "hidden";
  viewer.IFC.selector.unpickIfcItems();

  if (e.target.getAttribute("id") === null) {
    contextMenu.style.display = "none";
  }

  if (e.target.getAttribute("id") === "snapshoot-option") {
    contextMenu.style.display = "none";
    const urlImage = viewer.context.renderer.newScreenshot();
    virtualLink(urlImage, "Captura.png");
  }

  if (e.target.getAttribute("id") === "hide-element") {
    contextMenu.style.display = "none";
    if (rigthClickResult === null) return;
    hideClickedItem(rigthClickResult);
  }

  if (e.target.getAttribute("id") === "isolate-element") {
    contextMenu.style.display = "none";
    if (rigthClickResult === null) return;
    const index = rigthClickResult.faceIndex;
    const id = viewer.IFC.loader.ifcManager.getExpressId(model.geometry, index);
    await viewer.IFC.selector.highlightIfcItemsByID(model.modelID, [id], true);
  }

  if (e.target.getAttribute("id") === "show-element") {
    contextMenu.style.display = "none";
    viewer.IFC.selector.unHighlightIfcItems();
    showAllItems(getAllIds());
  }

  if (e.target.getAttribute("id") === "new-annotation") {
    contextMenu.style.display = "none";
    const location = rigthClickResult.point;

    const labelContainer = document.createElement("div");
    labelContainer.className = "base-label";
    
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "x";
    deleteButton.className = "delete-button hidden";
    labelContainer.appendChild(deleteButton);
    
    const label = document.createElement("p");
    label.className = "label";
    labelContainer.appendChild(label);
    
    const message = window.prompt("Describe la incidencia:");
    label.textContent = message;
    
    const labelObject = new CSS2DObject(labelContainer);
    labelObject.position.copy(location);
    scene.add(labelObject);
    annotations.push(labelObject);

    deleteButton.onclick = () => {
      labelObject.removeFromParent();
      labelObject.element = null;
      labelContainer.remove;
      const newAnnotationGroup = annotations.filter((item) => {return item !== labelObject});
      annotations = newAnnotationGroup;
    }
    
    labelContainer.onmouseenter = () => deleteButton.classList.remove("hidden");
    labelContainer.onmouseleave = () => deleteButton.classList.add("hidden");
  
  }

  if (e.target.getAttribute("id") === "save-annotation"){
    const annotationsSerialized = annotations.map((item) => {return JSON.stringify(item)});
    const annotationFormat = annotationsSerialized.map((item) => {
      if(annotationsSerialized.length===1){
        return `[${item}]`
      }else{
        if(annotationsSerialized.indexOf(item)===0){
          return `[${item},`
        }else if (annotationsSerialized.indexOf(item)===annotationsSerialized.length-1){
          return `${item}]`
        }else{
          return `${item},`
        }
      }
    });
    const file = new File(annotationFormat,"annotations");
    const fileURL = URL.createObjectURL(file);
    virtualLink(fileURL, "annotations.json");
  }

  if (e.target.getAttribute("id") === "load-annotation"){
    const inputAnnotation = document.getElementById("load-annotation-file");
    inputAnnotation.click();
    inputAnnotation.onchange = async () => {
      contextMenu.style.display = "none";
      const selectedFile = inputAnnotation.files[0];
      const selectedFileURL = URL.createObjectURL(selectedFile);
      const rawFileData = await fetch(selectedFileURL);
      const annotationsProperties = await rawFileData.json();
      console.log(annotationsProperties);
    };
  }
});

//FUNCIONES AUXILIARES
function setupProject() {
  const currenturl = window.location.href;
  const url = new URL(currenturl);
  const idProperty = url.searchParams.get("id");

  const projectObjArray = proyectos.filter((model) => {
    if (model.id === idProperty) {
      return model;
    }
  });

  const projectObj = projectObjArray[0];
  const projectTitle = projectObj.name;
  const projectURL = projectObj.url

  projectName.textContent = projectTitle;
  pageTitle.innerText = projectTitle;

  return [projectTitle,projectURL];
}

async function setupScene() {
  const viewer = new IfcViewerAPI({
    container,
    backgroundColor: new Color(0xffffff),
  });
  viewer.grid.setGrid();
  viewer.axes.setAxes();
  //togglePostProduction(true);
	return viewer;
}

async function setupMultiThreading(){
  await viewer.IFC.loader.ifcManager.useWebWorkers(true,"./IFCWorker.js");
}

function setupProgressNotification() {
  const text = document.getElementById('progress-text');
  viewer.IFC.loader.ifcManager.setOnProgress((event) => {
    const percent = event.loaded / event.total * 100;
    const result = Math.trunc(percent);
    text.innerText = result.toString();
    if(event.loaded===event.total){
      progressContainer.style.display = "none";
    }
  });
}

async function postprocessingPorperties(){
  const result = await viewer.IFC.properties.serializeAllProperties(model);
  const fileName = `properties_${modelName}`;
  const file = new File(result,"fileName");
  const fileUrl = URL.createObjectURL(file);
  virtualLink(fileUrl,`${fileName}.json`);

}

async function loadProperties(){
  const rawProperties = await fetch(`./resources/json/properties_${modelName}.json`);
  modelProperties = await rawProperties.json();
}

function activeDimensions(set){
  viewer.dimensions.active = set;
  viewer.dimensions.previewActive = set;
}

function loadPropertiesValues(properties){
  return Object.values(properties);
}

function virtualLink(url, downloadDoc) {
  const link = document.createElement("a");
  document.body.appendChild(link);
  if (downloadDoc) {
    link.download = downloadDoc;
  }
  link.href = url;
  link.click();
  link.remove();
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function togglePostProduction(active) {
  viewer.context.renderer.postProduction.active = active;
}

function returnTypesOfElements() {
  const allTypes = viewer.IFC.loader.ifcManager.typesMap;
  const modelTypes = model.ifcManager.properties.handler.state.models[model.modelID].types;
  const typesArray = [];
  for (let elementOfType in modelTypes) {
    typesArray.push(modelTypes[elementOfType]);
  }
  const typesUnique = Array.from(new Set(typesArray));
  const typesArrayElements = typesUnique.filter((e) => {
    if (e === 103090709 || e === 4097777520 || e === 4031249490 || e === 3124254112) {
      return false;
    } else {
      return true;
    }
  });
  const typeObject = {};
  for (let type of typesArrayElements) {
    typeObject[type] = allTypes[type];
  }
  return typeObject;
}

async function loadPlans(modelID) {
  await viewer.plans.computeAllPlanViews(modelID);
  const allPlans = viewer.plans.getAll(modelID);
  const planList = viewer.plans.planLists;
  const lineMaterial = new LineBasicMaterial({ color: "black" });
  const baseMaterial = new MeshBasicMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: 2,
  });
  viewer.edges.create("bordes", modelID, lineMaterial, baseMaterial);

  for (let plan of allPlans) {
    const currentPlan = planList[modelID][plan];
    const button = document.createElement("button");
    button.setAttribute("id", currentPlan.name);
    button.textContent = `NIVEL ${currentPlan.name}`;
    button.classList.add("floor-item");
    floorContainer.appendChild(button);
    button.onclick = () => {
      viewer.plans.goTo(model.modelID, plan);
      viewer.edges.toggle("bordes", true);
      togglePostProduction(false);
    };
  }
}

async function createIFCStructureTree(container) {
  const treeHeader = document.createElement("div");
  treeHeader.textContent = "Estructura IFC";
  treeHeader.classList.add("tree-header");
  container.appendChild(treeHeader);
  const tree = document.createElement("div");
  tree.classList.add("tree-structure");
  container.appendChild(tree);
  const list = document.createElement("ul");
  const listRoot = document.createElement("li");
  list.setAttribute("id", "myUL");
  listRoot.setAttribute("id", "tree-root");
  tree.appendChild(list);
  list.appendChild(listRoot);
  createTreeMenu(treeStructure, listRoot);
}

async function createTreeMenu(ifcProperties, root) {
  removeAllChildren(root);
  const ifcProject = await createNestedChild(root, ifcProperties);
  for (let child of ifcProperties.children) {
    createTreeMenuNode(ifcProject, child);
  }
}

async function createTreeMenuNode(parent, node) {
  const children = node.children;
  if (children.length === 0) {
    await createSimpleChild(parent, node);
    return;
  }
  const nodeElement = await createNestedChild(parent, node);
  for (let child of children) {
    createTreeMenuNode(nodeElement, child);
  }
}

async function createSimpleChild(parent, node) {
  const content = await nodeToSting(node);
  const childNode = document.createElement("li");
  childNode.classList.add("leaf-node");
  childNode.textContent = content;
  parent.appendChild(childNode);
  childNode.onmouseenter = () => {
    viewer.IFC.selector.prepickIfcItemsByID(model.modelID, [node.expressID]);
  };
  childNode.onclick = async () => {
    await viewer.IFC.selector.highlightIfcItemsByID(
      model.modelID,
      [node.expressID],
      true
    );
    const higlightedItem = {
      modelID: model.modelID,
      id: node.expressID,
    };
    menuHtml.appendChild(propMenu);
    menuHtml.appendChild(propContent);
    propertiesPanel(higlightedItem);
  };
}

async function createNestedChild(parent, node) {
  const content = await nodeToSting(node);
  const root = document.createElement("li");
  createTitle(root, content);
  const childrenContainer = document.createElement("ul");
  childrenContainer.classList.add("nested");
  root.appendChild(childrenContainer);
  parent.appendChild(root);
  return childrenContainer;
}

function createTitle(parent, content) {
  const title = document.createElement("span");
  title.classList.add("caret");
  title.addEventListener("click", function () {
    title.parentElement.querySelector(".nested").classList.toggle("active");
    title.classList.toggle("caret-down");
  });
  title.textContent = content;
  parent.appendChild(title);
}

async function nodeToSting(node) {
  const nameType = node.type;
  const nodeProp = await propertiesOfNode(node);

  if (nameType === "IFCPROJECT"){
    return modelName;
  }
  if (nameType === "IFCSITE"){
    return "SITE";
  }
  if (nameType === "IFCBUILDING"){
    return "BUILDING";
  }
  if (nameType === "IFCBUILDINGSTOREY"){
    return nodeProp.Name.value;
  }  
  const ifcTypeName = traslateIfcType(ifcTypes[nodeProp.type]);
  const ifcSaceemType = saceemTypes.filter(item => item.RelatedObjects.includes(node.expressID))[0];
  let ifcTypeDisplay;
  if (ifcSaceemType){
    if(ifcSaceemType.NominalValue.length>3){ifcTypeDisplay=ifcSaceemType.NominalValue}else{ifcTypeDisplay=ifcTypeName};
  }else{
    ifcTypeDisplay=ifcTypeName;
  }
  const ifcId = saceemIds.filter(item => item.RelatedObjects.includes(node.expressID));
  let ifcIdValue="";
  if(ifcId[0]!==undefined){
    ifcIdValue = `- ${ifcId[0].NominalValue}`;
  }
  return `${ifcTypeDisplay} ${ifcIdValue}`;
}

async function propertiesOfNode(node){
  return await viewer.IFC.loader.ifcManager.getItemProperties(model.modelID,node.expressID,false);
}

function traslateIfcType(typeName){
  if(ifcTraducidoEsp.hasOwnProperty(typeName)){
    return ifcTraducidoEsp[typeName];
  } else {
      return typeName;
  }
}

async function propertiesPanel(result) {
  menuHtml.classList.add("ifc-property-menu");
  propMenu.classList.add("ifc-property-item");
  propMenu.style.backgroundColor = "#ffd900";
  propMenu.textContent = "Propiedades";
  if (!result) return;
  let prop = await viewer.IFC.getProperties(
    result.modelID,
    result.id,
    false,
    false
  );
  const propPsets = await viewer.IFC.loader.ifcManager.getPropertySets(
    result.modelID,
    result.id,
    true
  );
  const saceemProps = extractSaceemProperties(propPsets);
  createPropertiesMenu(prop, saceemProps, propContent);
}

function extractSaceemProperties(psets){
  for (let pset of psets) {
    if (pset.Name.value === "IFC_DATOS_SACEEM") {
      return pset.HasProperties;
    }
  }
}

function createPropertiesMenu(properties, saceemProperties, container) {
  removeAllChildren(container);
  if (saceemProperties) {
    const objPropSaceem = {};
    for (let saceemProp of saceemProperties) {
      const propKey = saceemProp.Name.value;
      let propValue = saceemProp.NominalValue.value;
      if (Number.isNaN(parseFloat(propValue))) {
        propValue;
      } else {
        if(propKey==="SC_FECHA DE LLENADO" || propKey==="SC_LOTE HORMIGON" || propKey==="SC_FECHA DE MONTAJE" || propKey==="SC_TEN_FECHA DE TENSADO" || propKey==="SC_TEN_FECHA DE CORTE" || propKey==="SC_FECHA LLEGADA OBRA"){
          const year = propValue.substring(2,-1);
          const month = propValue.substring(2,4);
          const day = propValue.substring(4);
          propValue = `${day}/${month}/20${year}`;
        }else{
          propValue = parseFloat(propValue).toFixed(2);
        }
      }
      objPropSaceem[propKey] = propValue;
    }
    for (const key in objPropSaceem) {
      createPropertyEntry(key, objPropSaceem[key], container);
    }
  } else {
    for (const key in properties) {
      createPropertyEntry(key, properties[key], container);
    }
  }
}

function createPropertyEntry(key, value, container) {
  const propContainer = document.createElement("div");
  propContainer.classList.add("ifc-property-item");

  if (value === null || value === undefined) {
    value = undefined;
  } else if (value.value) {
    value = value.value;
  }

  const keyElement = document.createElement("div");
  keyElement.textContent = key;
  propContainer.appendChild(keyElement);

  const valueElement = document.createElement("div");
  valueElement.classList.add("ifc-property-value");
  valueElement.textContent = value;
  propContainer.appendChild(valueElement);

  container.appendChild(propContainer);
}

function checkBoxMainStructure(mainContainer,title){
  const listHeader = document.createElement("div");
  listHeader.textContent = title;
  listHeader.classList.add("categories-header");
  mainContainer.appendChild(listHeader);
  const subContainer = document.createElement("div");
  subContainer.classList.add("categories-structure");
  mainContainer.appendChild(subContainer);
  return subContainer;
}

async function createCheckBoxStructure() {
  const categoriesContainer = checkBoxMainStructure(checkboxesOfType,"Categorías IFC");
  for (let cat in ifcTypes) {
    const categoryElements = createCheckBox(ifcTypes[cat],"ifcType");
    categoryElements[0].prepend(categoryElements[1]);
    categoriesContainer.appendChild(categoryElements[0]);
  }
  await setupAllCategories();
}

function createCheckBox(name,type){
  const checkbox = document.createElement("div");
  //checkbox.classList.add("checkboxes-children");
  const input = document.createElement("input");
  input.setAttribute("checked",true);
  input.setAttribute("type","checkbox");
  input.setAttribute("id",name);
  if (type === "ifcType"){
    checkbox.textContent = traslateIfcType(name);
  }else{
    checkbox.textContent = name;
  }
  return [checkbox,input];
}

async function getAll(category){
  return await viewer.IFC.loader.ifcManager.getAllItemsOfType(model.modelID,category,false);
}

async function newSubsetOfType(category){
  const ids = await getAll(category);
  return viewer.IFC.loader.ifcManager.createSubset({
    modelID: model.modelID,
    scene,
    ids,
    removePrevious: true,
    customID: category.toString()
  })
}

async function setupAllCategories(){
  const allCategories = Object.keys(ifcTypes);
  for (let categoryValue of allCategories){
    const categoryValueToNumber = parseInt(categoryValue);
    await setupCategory(categoryValueToNumber); 
  }
}

async function setupCategory(category){
  categorySubsets[category] = await newSubsetOfType(category);
  togglePickable(categorySubsets[category], true);
  setupCheckBox(category);
}

function setupCheckBox(category){
  const name = ifcTypes[category];
  const checkbox = document.getElementById(name);
  checkbox.addEventListener("change",(e)=>{
    const checked = e.target.checked;
    const subset = categorySubsets[category];
    if (checked){
      scene.add(subset);
      togglePickable(subset, true);
    }else{
      subset.removeFromParent();
      togglePickable(subset, false);
    }
  })
}

function getAllPsets(){
  return propertyValues.filter(item => item.type === "IFCRELDEFINESBYPROPERTIES");
}

function getAllSaceem(psets){
  return psets.filter(item => modelProperties[item.RelatingPropertyDefinition].Name === "IFC_DATOS_SACEEM");
}

function getAllSaceemParameters(propSaceem){
  const saceemChildren = propSaceem.map((item) => {
    const propDefinition = modelProperties[item.RelatingPropertyDefinition];
    propDefinition.RelatedObjects = item.RelatedObjects;
    return propDefinition;
  });
  
  const allsaceemProps = saceemChildren.map((item) => { 
    let hasPropsArray = [];
    for (let hprop of item.HasProperties){
      const childPropDef = modelProperties[hprop];
      childPropDef.RelatedObjects = item.RelatedObjects;
      hasPropsArray.push(childPropDef);
      
    }
    return hasPropsArray;
  }).flat();
  return allsaceemProps;
}

function getAllSaceemIds(parametersList){
  return parametersList.filter(item => item.Name === "SC_ID" || item.Name === "SC_ID.CONJUNTO");
}

function getAllSaceemConcreteDates(parametersList){
  const fechasLote = parametersList.filter(item => item.Name === "SC_LOTE HORMIGON");
  const fechasLlenado = parametersList.filter(item => item.Name === "SC_FECHA DE LLENADO");
  if (fechasLote.filter(item => item !== null).length === 0){
    return fechasLlenado;
  }else{
    return fechasLote;
  }
}

function getAllSaceemQuantities(parametersList){
  return parametersList.filter(item => item.Name === "SC_VOLUMEN");
}

function getAllSaceemAssemblyDates(parametersList){
  return parametersList.filter(item => item.Name === "SC_FECHA DE MONTAJE");
}

function getAllSaceemProcedences(parametersList){
  const presacState = "Prefabricado Planta";
  return parametersList.filter(item => item.Name === "SC_PROCEDENCIA");
}

function getAllSaceemTypes(parametersList){
  return parametersList.filter(item => item.Name === "SC_TIPO.PIEZA");
}

function getAllIds() {
	return Array.from(new Set(model.geometry.attributes.expressID.array),
	);
}

async function visualSetup() {
	const allIDs = getAllIds();
	const subset = viewer.IFC.loader.ifcManager.createSubset({
   scene,
   modelID: model.modelID,
   ids: allIDs,
   applyBVH: true,
   removePrevious: true,
   customID: "full-model-subset"
  })
	replaceOriginalModelBySubset(subset);
  return subset;
}

function replaceOriginalModelBySubset(subset) {
	const items = viewer.context.items;
	items.pickableIfcModels = items.pickableIfcModels.filter(ifcModel => ifcModel !== model);
	items.ifcModels = items.ifcModels.filter(ifcModel => ifcModel !== model);
	model.removeFromParent();

	items.ifcModels.push(subset);
	items.pickableIfcModels.push(subset);
}

function showAllItems(ids) {
	viewer.IFC.loader.ifcManager.createSubset({
		scene,
    modelID: 0,
		ids,
		removePrevious: false,
		applyBVH: true,
		customID: "full-model-subset"
	});
}

function hideClickedItem(result) {
	if (!result) return;
	const id = viewer.IFC.loader.ifcManager.getExpressId(result.object.geometry, result.faceIndex);
	viewer.IFC.loader.ifcManager.removeFromSubset(0,[id],"full-model-subset");
}

function togglePickable(mesh, isPeackable) {
  const pickable = viewer.context.items.pickableIfcModels;
  const isMeshpickable = pickable.includes(mesh);
  if (isPeackable) {
    pickable.push(mesh);
    /*if (!isMeshpickable){
      
    }*/
  } else {
    const index = pickable.indexOf(mesh);
    pickable.splice(index, 1);
  }
}

function createComplexCheckBoxStructure(mainContainer) {
  const levelContainer = checkBoxMainStructure(mainContainer,"Distribución Espacial");
  const allLevels = getAllLevels();
  for (let level of allLevels) {
    const levelElement = createCheckBox(level.Name,"ifcLevel");
    levelElement[0].prepend(levelElement[1]);
    levelContainer.appendChild(levelElement[0]);
    const ifcTypesInLevel = getTypesInLevel(level.expressID);
    for (let ifcType of ifcTypesInLevel){
      setupLevelAndCategory(level.Name,ifcType,levelContainer);
    }
    setupLevelCheckBox(level);
  }
}

function getAllLevels(){
  let levels = [];
  for (let rel of getAllSpatialRelations(propertyValues)){
    levels.push(propertyValues.filter(item => item.expressID === rel.RelatingStructure)[0]);
  }
  return levels;
}

function getTypesInLevel(levelId){
  const spaceRelations = getAllSpatialRelations(propertyValues);
  const ifcTypesList = Object.values(ifcTypes);
  const levelRelations = spaceRelations.filter(item => item.RelatingStructure === levelId)[0];
  const typesInLevel = [];
  for (let elementId of levelRelations.RelatedElements){
    for (let type of ifcTypesList){
      const elementType = modelProperties[elementId].type;
      if (elementType === type){
        typesInLevel.push(elementType);
      }
    }
  }
  return Array.from(new Set(typesInLevel));
}

function getAllSpatialRelations(properties){
  return properties.filter(item => item.type === "IFCRELCONTAINEDINSPATIALSTRUCTURE")
}

function setupLevelCheckBox(level){
  const name = level.Name;
  const inputOrder = "0";
  const checkboxLevel = document.getElementById(name);
  const checkboxesChildren = document.querySelectorAll(".checkboxes-children");
  checkboxLevel.addEventListener("change",(e)=>{
    const checked = e.target.checked;
    for (let childNode of checkboxesChildren){      
      const inputType = childNode.childNodes[inputOrder];
      const inputTypeId = inputType.id;
      const subset = categoryPerLevelSubsets[inputTypeId];
      if (checked){
        if (inputTypeId.includes(name)){
          inputType.checked = true;
          scene.add(subset);
          togglePickable(subset, true);
        }
      }else{
        if (inputTypeId.includes(name)){
          inputType.checked = false;
          subset.removeFromParent();
          togglePickable(subset, false);
        }
      }
    }
  })
}

function setupLevelAndCategory(level,category,container){
  categoryPerLevelSubsets[`${level}_${category}`] = newSubsetOfLevelAndType(level,category);
  togglePickable(categoryPerLevelSubsets[`${level}_${category}`], true);
  setupComplexCheckBox(level,category,container);
}

function newSubsetOfLevelAndType(level,category){
  const spatialRelations = getAllSpatialRelations(propertyValues);
  const ids = [];
  for (let relation of spatialRelations){
    const levelProps = modelProperties[relation.RelatingStructure];
    if(levelProps.Name === level){
      const relatedLevelIds = relation.RelatedElements;
      for (let id of relatedLevelIds){
        const elementType = modelProperties[id].type;
        if (elementType === category){
          ids.push(id);
        }
      }
    }
  }
  if(ids.length){
  return viewer.IFC.loader.ifcManager.createSubset({
    modelID: model.modelID,
    scene,
    ids,
    removePrevious: true,
    customID: `${level}_${category}`
    })
  }
}

function setupComplexCheckBox(level,category,container){
  const typeSubElement = createCheckBox(category,"ifcType");
  typeSubElement[1].setAttribute("id",`${level}_${category}`);
  typeSubElement[0].prepend(typeSubElement[1]);
  container.appendChild(typeSubElement[0]);
  typeSubElement[0].classList.add("checkboxes-children");
  typeSubElement[0].addEventListener("change",(e)=>{
    const checked = e.target.checked;
    const subset = categoryPerLevelSubsets[`${level}_${category}`];
    if (checked){
      scene.add(subset);
      togglePickable(subset, true);
    }else{
      subset.removeFromParent();
      togglePickable(subset, false);
    }
  })
}

function createTimeCheckBoxStructure(mainContainer) {
  const levelContainer = checkBoxMainStructure(mainContainer,"Secuencia constructiva");
  const allDates = timeSecuence();
  const allDatesYears =  allDates.map(item => {
    return item.substring(2,-1)
  });
  const allYears = Array.from(new Set(allDatesYears));
  for (let year of allYears) {
    const volumnInAYear = volumnsInAPeriod(1,year);
    const yearElement = createCheckBox(`Año 20${year} - ${volumnInAYear}m`, "ifcDate");
    const cubicMetersY = document.createElement("sup");
    cubicMetersY.textContent="3";
    yearElement[1].setAttribute("id", `YY${year}`);
    yearElement[0].prepend(yearElement[1]);
    yearElement[0].append(cubicMetersY);
    levelContainer.appendChild(yearElement[0]);
    const allMonths = allDates.map(item => {
      if (item.substring(2,-1)===year){
        return item.substring(2,4);
      }
    }).filter(item => item !== undefined);
    const allMonthsInYear = Array.from(new Set(allMonths));
    for (let month of allMonthsInYear){
      const volumnInAMonth = volumnsInAPeriod(2,year,month);
      const monthElement = createCheckBox(`Mes ${month} - ${volumnInAMonth}m`, "ifcDate");
      const cubicMetersM = document.createElement("sup");
      cubicMetersM.textContent="3";
      monthElement[1].setAttribute("id", `YY${year}_MM${month}`);
      monthElement[0].prepend(monthElement[1]);
      monthElement[0].append(cubicMetersM);
      monthElement[0].classList.add("checkboxes-children");
      levelContainer.appendChild(monthElement[0]);
      const allDays = allDates.map(item => {
        if (item.substring(4,-1)===`${year}${month}`){
          return item.substring(4).substring(2,-1);
        }
      }).filter(item => item !== undefined);
      for (let day of allDays){
        setupDateCheckBox(year,month,day,levelContainer);
      }
      setupPeriodCheckBox(2,year,month);
    }
    setupPeriodCheckBox(1,year);
  }
}

function timeSecuence() {
  const datesArray = [];
  for (let concreteDate of saceemConcreteDates){
    datesArray.push(concreteDate.NominalValue)
  }
  for (let assemblyDate of saceemAssembyDates){
    datesArray.push(assemblyDate.NominalValue)
  }
  const datesUnique = Array.from(new Set(datesArray));
  datesUnique.sort((a,b)=>{
    if (a < b) {
      return 1;
    }
    if (a > b) {
      return -1;
    }
    return 0;
  });
  return datesUnique;

}

function volumnsInAPeriod(level,year,month,day){
  let totalVolumn=[];
  for (let vol of saceemVolumns){
    const idRelated = vol.RelatedObjects[0];
    const procedence = elementProcedence(idRelated);
    if (procedence!=="Prefabricado Planta"){
      const date = saceemConcreteDates.map(item =>{
        if (item.RelatedObjects[0]===idRelated){
          return item.NominalValue;
        }
      }).filter(item => item !== undefined)[0];
      let idDate;
      if (date){
        if (level===1){
          idDate = date.substring(2,-1);
          if (idDate===year){
            totalVolumn.push(vol.NominalValue);
          }
        }
        if (level===2){
          idDate = date.substring(4,-1);
          if (idDate===`${year}${month}`){
            totalVolumn.push(vol.NominalValue);
          }
        }
        if (level===3){
          idDate = date.substring(6,-1);
          if (idDate===`${year}${month}${day}`){
            totalVolumn.push(vol.NominalValue);
          }
        }
      }
    }
  }
  if(totalVolumn.length>0){
    return totalVolumn.reduce((a,b)=>{
      return a+b;
    }).toFixed(0);
  }else{
    return 0;
  }
}

function setupPeriodCheckBox(level,year,month){
  const inputOrder = "0";
  let idTracker;
  let checkboxesChildren;
  if (level===1){
    idTracker = `YY${year}`;
    checkboxesChildren = document.querySelectorAll(".checkboxes-children , .checkboxes-children-LII");
  }
  if (level === 2){
    idTracker = `YY${year}_MM${month}`;
    checkboxesChildren = document.querySelectorAll(".checkboxes-children-LII");
  }
  const checkboxTracker = document.getElementById(idTracker);
  checkboxTracker.addEventListener("change",(e)=>{
    const checked = e.target.checked;
    for (let childNode of checkboxesChildren){      
      const inputType = childNode.childNodes[inputOrder];
      const inputTypeId = inputType.id;
      const subset = dateSubsets[inputTypeId];
      if (inputTypeId.includes(idTracker)){
        if (checked){
          inputType.checked = true;
          if (subset){
            scene.add(subset);
            togglePickable(subset, true);
          }
        }else{
          inputType.checked = false;
          if (subset){
            subset.removeFromParent();
            togglePickable(subset, false);
          }
        }
      }
    }
  });
}

function setupDateCheckBox(year,month,day,container){
  dateSubsets[`YY${year}_MM${month}_DD${day}`] = newSubsetOfDate(year,month,day);
  if(dateSubsets[`YY${year}_MM${month}_DD${day}`]){
    togglePickable(dateSubsets[`YY${year}_MM${month}_DD${day}`], true);
  };
  setupDaysCheckBox(year,month,day,container);
}

function setupDaysCheckBox(year, month, day, container) {
  const volumnInADay = volumnsInAPeriod(3, year, month, day);
  const dayElement = createCheckBox(`Día ${day} - ${volumnInADay}m`, "ifcDate");
  const cubicMetersD = document.createElement("sup");
  cubicMetersD.textContent = "3";
  dayElement[1].setAttribute("id", `YY${year}_MM${month}_DD${day}`);
  dayElement[0].prepend(dayElement[1]);
  dayElement[0].append(cubicMetersD);
  dayElement[0].classList.add("checkboxes-children-LII");
  container.appendChild(dayElement[0]);
  dayElement[0].addEventListener("change", (e) => {
    const checked = e.target.checked;
    const subset = dateSubsets[`YY${year}_MM${month}_DD${day}`];
    if (subset) {
      if (checked) {
        scene.add(subset);
        togglePickable(subset, true);
      } else {
        subset.removeFromParent();
        togglePickable(subset, false);
      }
    }
  });
}

function newSubsetOfDate(year,month,day){
  const dateId = `${year}${month}${day}`;
  const ids = [];
  const idConcrete = saceemConcreteDates.flatMap(item =>{
    if (item.NominalValue.substring(6,-1) === dateId){
      return item.RelatedObjects;
    }
  }).filter(item => item !== undefined)
  .filter(item => {return elementProcedence(item).indexOf("Prefabricado")===-1});

  const idAssembly = saceemAssembyDates.flatMap(item =>{
    if (item.NominalValue.substring(6,-1) === dateId){
      return item.RelatedObjects;
    }
  }).filter(item => item !== undefined)
  .filter(item => {return elementProcedence(item).indexOf("Prefabricado")!==-1});
  ids.push(idConcrete);
  ids.push(idAssembly);
  const idsFlat = ids.flat(2);
  
  if (idsFlat.length) {
    return viewer.IFC.loader.ifcManager.createSubset({
      modelID: model.modelID,
      scene,
      ids: idsFlat,
      removePrevious: true,
      customID: `YY${year}_MM${month}_DD${day}`,
    });
  }
}

function createCalculatorStructure(mainContainer) {
  const volumTable = document.createElement("table");
  volumTable.setAttribute("id","volum-table");
  mainContainer.appendChild(volumTable);

  const mainTableHeader = document.createElement("tr");
  volumTable.appendChild(mainTableHeader);
  const tableHeader = document.createElement("th");
  tableHeader.textContent="Calculadora de volúmenes"
  tableHeader.setAttribute("colspan","2");
  volumTable.appendChild(tableHeader);

  const tableSubHeader = document.createElement("tr");
  tableSubHeader.setAttribute("id","volum-table-subheader");
  volumTable.appendChild(tableSubHeader);
  const subHeaderIdSaceem = document.createElement("td");
  subHeaderIdSaceem.textContent = "ID";
  const subHeaderVolum = document.createElement("td");
  subHeaderVolum.textContent = "Valor (m3)";
  tableSubHeader.appendChild(subHeaderIdSaceem);
  tableSubHeader.appendChild(subHeaderVolum)

  const tableBody = document.createElement("tbody");
  tableBody.setAttribute("id","volum-table-body");
  volumTable.appendChild(tableBody);

  const totalContainer = document.createElement("tfoot");
  volumTable.appendChild(totalContainer);
  const totalRow = document.createElement("tr");
  totalContainer.appendChild(totalRow);
  
  const totalLabel = document.createElement("td");
  totalLabel.textContent="TOTAL";
  const totalValue = document.createElement("td");
  totalValue.textContent="0";
  totalValue.setAttribute("id","total-volum");
  totalRow.appendChild(totalLabel);
  totalRow.appendChild(totalValue);

}

function newValue(idTable,idElement){
  const tableBody = document.getElementById(idTable);
  const individualRow = document.createElement("tr");
  tableBody.appendChild(individualRow);

  const saceemId = document.createElement("td");
  saceemId.textContent = elementSaceemId(idElement);
  const saceemVolum = document.createElement("td");
  saceemVolum.textContent = elementSaceemVolum(idElement);
  individualRow.appendChild(saceemId);
  individualRow.appendChild(saceemVolum);

}

function totalCalculator(group){
  let volums = [];
  for (let item of group){
    const indValue = elementSaceemVolum(item);
    volums.push(parseFloat(indValue));
  }
  if(volums.length>0){
    return volums.reduce((a,b)=>{
      return a+b;
    });
  }else{
    return 0;
  }
  
}

function totalPrint(totalVolumnValue){
  const foot = document.getElementById("total-volum");
  foot.textContent = totalVolumnValue;
}

function elementProcedence(id){
  return presacStatus.map(item =>{
    if (item.RelatedObjects.includes(id)){
      return item.NominalValue;
    }
  }).filter(item => item !== undefined)[0];
}

function elementSaceemId(id){
  return saceemIds.map(item =>{
    if (item.RelatedObjects.includes(id)){
      return item.NominalValue;
    }
  }).filter(item => item !== undefined)[0];
}

function elementIdFromSaceem(idSaceem){
  for (let item of saceemIds){
    if(item.NominalValue === idSaceem){
      return item.RelatedObjects[0];
    }
  }
}

function elementSaceemVolum(id){
  const volum = saceemVolumns.map(item =>{
    if (item.RelatedObjects.includes(id)){
      return item.NominalValue;
    }
  }).filter(item => item !== undefined)[0];

  return parseFloat(volum).toFixed(2);
}

function lockButtons(groupOfButtons,lock){
  if(lock){
    for (let item of groupOfButtons){
      item.classList.add("button-lock");
    }
  }else{
    for (let item of groupOfButtons){
      item.classList.remove("button-lock");
    }
  }
}