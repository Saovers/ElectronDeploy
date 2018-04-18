var ping = require ('ping');
var SSH2Promise = require ('ssh2-promise');
var shell = require('shelljs');
var config = require('./config.json');
var $ = require('jQuery');
const { exec } = require('child_process');
var fs = require('fs');
//Variable 
var name;
var olddir;
var nameS;
var number =1;
var hashToRevert=0;
const GIT = 'https://github.com/Saovers';
//FIXME: process.cwd() à la place de /home/christopher/Scripts
var hash = exec('cd /home/christopher/Scripts && git log | head -n 1 | cut -c8-47',(err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(stdout);
  });
//var Dname = exec('pwd | sed \'s#.*/##\'', { silent: true }).replace('\n', '').replace('\r', '');

var sshconfig = {
    host: config.host,
    username: config.user,
    identity: '/home/christopher/.ssh/id_rsa'
  }
  var ssh = new SSH2Promise(sshconfig);


//Test ping à l'ip du serveur
let pingHost =async () =>{
    var hosts = [config.host];
    try{
        hosts.forEach( function(host){
            ping.promise.probe(config.host).then(function (isAlive){

                        if (isAlive.alive){
                            console.log('Host OK');
                            document.getElementById('resH').innerHTML = "Host OK";
                        }
                        else{
                            console.log('Host unreachable');
                            document.getElementById('resH').innerHTML = "Host Down";
                            document.getElementById('place2').innerHTML = "Impossible de continuer plus loin si l'host est down veuiller changer l'ip de votre serveur";
                        }
            });             
        });
    }
    catch(e){
    console.log(e);
    }
}
    

//Vérification des packages nécessaire au script
let isInstalled = async ()=> {
    await ssh.exec("dpkg -s git | head -2 | echo $?").then((data) => {
        console.log('Le paquet git est bien installé');
        $( ".response" ).append( "<p>Le paquet git est bien installé</p>" );
    }).catch((error) => {
        console.log("Error : " + error);
        process.exit();
    });

    await ssh.exec("dpkg -s mongodb-org | head -2 | echo $?").then((data) => {
        console.log('Le paquet mongoDB est bien installé');
        $( ".response" ).append( "<p>Le paquet mongoDB est bien installé</p>" );
    }).catch((error) => {
        console.log("Error : " + error);
        process.exit();
    });

    await ssh.exec(" pm2 -v | echo $?").then((data) => {
        console.log('Le paquet PM2 est bien installé');
        $( ".response" ).append( "<p>Le paquet PM2 est bien installé</p>" );
    }).catch((error) => {
        console.log("Error : " + error);
        process.exit();
    });
}
 
//Création du dossier s'il n'existe pas en /var/wwww/project
let testDir = async()=> {
    await ssh.exec('mkdir -p /var/www/' + config.name);
    $( ".response" ).append( "<p>Le dossier principale existe déjà</p>" );
    console.log('Le dossier /var/www/'+config.name+' existe déjà');
}

//Vérification qui compte le nombre de dossier, si le nombre exède 10 on passe à olddirectory
let clone = async()=> {
    let data = await ssh.exec('cd /var/www/' + config.name + ' && ls -lt | nl | tail -n 1 | cut -c5-6');
    $( ".response" ).append( "<p>Il y actuellement "+parseInt(data - 1)+" sous dossier dans /var/www/"+config.name+"</p>" );
    console.log("Il y a actuellement : " + parseInt(data - 1) + ' sous dossier');
        if (parseInt(data - 1) > 10) {
            await Olddirectory();
        }
        else {
            console.log('Pas de suppression nécessaire'.bgBlue);
        }
}

//Fonction appelée dans clone, elle prend le nom du dossier le plus vieux
let Olddirectory = async ()=> {
    let olddirl = await ssh.exec('cd /var/www/' + config.name + ' && ls -tl | tail -n 1 | cut -c48-96');
    $( ".response" ).append( "<p>Le dossier le plus vieux est : "+olddirl+"</p>" );
        console.log('Le dossier le plus vieux est : ' + olddirl);
        olddir = olddirl;
        await RemoveOld();
}

//Fonction appelée dans Olddirectory, elle supprime le vieux dossier s'il y a + de 10 sous dossiers dans le projets
let RemoveOld = async ()=> {
    if (olddir==""){
        console.log('La variable olddir est vide, attention cela risque de supprimer tous vos dossiers, vérifier dans le code le soucis');
    }
    else{
        console.log(olddir);
        try{
            console.log(' rm -rd /var/www/' + config.name + '/' + olddir);
            await ssh.exec(' rm -rd /var/www/' + config.name + '/' + olddir);
            $( ".response" ).append( "<p>Le dossier : "+olddir+" est maintenant supprimé!</p>" );
            console.log('dossier supprimer');
        }
       catch(error){
           console.log(error.toString('utf8'));
       }
    }
}


//Clone du projet dans /var/www/project/hash
let gitclone = async ()=> {
    try{
        console.log(' git clone ' + GIT + '/' + config.name + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''));
        await ssh.exec(' git clone ' + GIT + '/' + config.name + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''));
        $( ".response" ).append( "<p>Le projet " +config.name+" est cloné</p>" );
        console.log('dossier cloné');
    }
    catch(error){
        console.log(error.toString('utf8'));
        $( ".response" ).append( "<p>Le projet " +config.name+" est déjà cloné sur le serveur</p>" );
    }
}

let globalInit = async() =>
{
    await pingHost();
    await isInstalled();
    await testDir();
    await clone();
}