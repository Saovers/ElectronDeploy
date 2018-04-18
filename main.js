const electron = require('electron');
const url = require('url');
const path = require('path');

const{app, BrowserWindow,Menu} = electron ;

let mainWindow;

const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));

//Listen for app to be ready
app.on('ready',function(){
    //Create a window
    mainWindow = new BrowserWindow({});
    //Load html into window
    mainWindow.loadURL(url.format({
        pathname : path.join(__dirname,'mainWindow.html'),
        protocol : 'file:',
        slashes : true

    })); 

    //Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    //Insert menu
    //Menu.setApplicationMenu(mainMenu);
});

//Create menu template
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
];
