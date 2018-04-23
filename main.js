const electron = require('electron');
const url = require('url');
const path = require('path');

const{app, BrowserWindow,Menu} = electron ;

let mainWindow;

const { default: installExtension, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer');

//Listen for app to be ready
app.on('ready',function(){

    installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));

    installExtension(REDUX_DEVTOOLS)
        .then((name) => console.log(`Added Extension: ${name}`))
        .catch((err) => console.log('An error occurred: ', err));
    //Create a window
    mainWindow = new BrowserWindow({width: 1800, height: 1200});
    //Load html into window
    mainWindow.loadURL(url.format({
        pathname : path.join(__dirname,'mainWindow.html'),
        protocol : 'file:',
        slashes : true

    })); 

    //Build menu from template
   /* const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu); */
});

//Create menu template
/*
const mainMenuTemplate= [ 
    {
        label:'Menu',
        submenu:[
            {
                label:'Quitter', 
                accelerator: process.platform=='darwin' ? 'Command+Q' :
                'Ctrl+Q',
                click(){
                    app.quit();
                }
            },
            {
                label:'Clear all'
            }
        ]
}
];*/