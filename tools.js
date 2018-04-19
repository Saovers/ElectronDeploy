var ping = require ('ping');
var SSH2Promise = require ('ssh2-promise');
var config = require('./config.json');
var $ = require('jQuery');
var fs = require('fs');
//Variable 
var name;
var olddir;
var nameS;
var number =1;
var hashToRevert=0;
const GIT = 'https://github.com/Saovers';
//FIXME: process.cwd() à la place de /home/christopher/Scripts
var shell = require('shelljs');
shell.config.execPath = '/usr/bin/node';
var hash = shell.exec(' git log | head -n 1 | cut -c8-47', {silent:true});

    

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
            console.log('Pas de suppression nécessaire');
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
        console.log(' git clone ' + GIT + '/' + config.name + ' /var/www/' + config.name + '/'+hash);
        await ssh.exec(' git clone ' + GIT + '/' + config.name + ' /var/www/' + config.name + '/'+hash);
        $( ".response" ).append( "<p>Le projet " +config.name+" est cloné</p>" );
        console.log('dossier cloné');
    }
    catch(error){
        console.log(error.toString('utf8'));
        $( ".response" ).append( "<p>Le projet " +config.name+" est déjà cloné sur le serveur</p>" );
    }
}

//Fonction DB, selon le choix elle exécutera une série de fonctions
let Db = async () =>{
     if (($('#rbOui').is(':checked'))) {
         console.log('rb oui est coché');
        await copieMongoUpdate();
        await countMongoUpdate();
        await recupName();
     }
     else if (($('#rbNull').is(':checked'))) {
        console.log('rb null coché');
       
     }
     else{
        console.log('rb non cohé');
        await MongoDump();
        await MongoRestore();
        await npm();
     }
}

//Copie du dossier mongoUpdate dans le répertoire sur le serveur 
let copieMongoUpdate = async ()=> {
    try{
        //FIXME: 
        await shell.exec('scp -r -p  /var/www/Scripts/mongoUpdate ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''), { silent: true });
        $( ".response" ).append( "<p>Le dossier mongoUpdate à été transmis sur le serveur</p>" );
    }
    catch(error){
        console.log('Le dossier mongoUpdate existe déjà et les scripts sont déjà transferer'); 
    }
}


//fonction qui va compter combien de script de MAJ il y a dans mongoUpdate
let countMongoUpdate = async ()=> {
    let data = await ssh.exec('cd /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate && ls -l . | egrep -c \'^-\'')
        console.log('Le nombre de script de MAJ mongo est de ' + data);
        $( ".response" ).append( "<p>Le nombres de scripts de MAJ est de : "+data+"</p>" );
        nbreMU = data;
}


//Fonction qui travail avec recupName, lorsque le nom est récupéré, il est transmis à cette fonction qui va exécuter le script
let transfert = async () =>{
   let data = await ssh.exec('mongo localhost:27017/' + config.db + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate/' + nameS)
            console.log('Script transmis et exécuter');
            number++;
            await recupName();
}


//Fonction appelée dans transfert(), elle récupère le nom des scripts dans mongoUpdate, quand tous les scripts sont transmis elle exécute npm()
let recupName = async ()=> {
    if (number>nbreMU){
        await MongoDumpMAJ();
        await npm();
    }
    if (number <= nbreMU) {
    let data = await ssh.exec('find /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/mongoUpdate -maxdepth 1 -type f -printf \'%f\\n\' | awk FNR=='+number+'')
        console.log('le nom du script ' + data);
        $( ".response" ).append( "<p>Le script  : "+data+" à été transmis</p>" );
        nameS = data;
        await transfert();
    }
}

//Fonction qui va dump la DB mise à jour grâce au script de MAJ, elle le fait dans /var/www/project/hash
let MongoDumpMAJ = async () =>{
    try{
        await ssh.exec('mongodump --db ' + config.db + ' -o /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database');
        console.log('La base de données est sauvegardée dans /database');
   }
    catch(error){
    console.log(error.toString('utf8'));
   }
}

//Fonction qui va dump la DB en local dans /tmp, ensuite elle crée le dossier database sur le serveur dans /var/www/project/hash et finalement elle transmet avec scp la db qui est dans /tmp 
let MongoDump = async () =>{
    shell.exec('mongodump --db ' + config.db + ' -o /tmp', { silent: true });
    try{
        await ssh.exec('mkdir /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database/');
        console.log('Dossier database créé');
        shell.exec('scp -r -p /tmp/' + config.db + ' ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database', { silent: true });
        $( ".response" ).append( "<p>Le base de donnée "+config.db+" à été transferée sur le serveur </p>" );
    }
    catch(error){
    $( ".response" ).append( "<p>Le base de donnée "+config.db+" à été transferée sur le serveur </p>" );
    console.log(error.toString('utf8'));
   }
}


//Fonction qui va restore la base de données grâce au dossier database présent dans le dossier du hash et elle supprime le dossier /tmp/db en locale
let MongoRestore = async ()=> {
    try{
        await ssh.exec('mongorestore --db ' + config.db + ' /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database/'+config.db);
        console.log('Mongo Restore effectué');
        shell.exec('rm -rf /tmp/' + config.db, { silent: true });
    }
    catch(error){
        $( ".response" ).append( "<p>Mongo restore de la DB effectué </p>" );
        shell.exec('rm -rf /tmp/' + config.db, { silent: true });
        console.log(error.toString('utf8'));
    }
}


//Installation des modules node
let npm = async ()=> {
    try{
        await ssh.exec('cd /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/ && npm install');
        console.log('Paquets npm installés'.bgGreen);
        $( ".response" ).append( "<p>NPM installés </p>" );
    }
    catch(error){
        console.log(error.toString('utf8'));
        console.log('Paquets NPM déjà installés'.bgBlue);
        $( ".response" ).append( "<p>NPM installé </p>" );
    }
}

let globalInit = async() =>
{
    await pingHost();
    await isInstalled();
    await testDir();
    await clone();
    await gitclone();
    await Db();
}