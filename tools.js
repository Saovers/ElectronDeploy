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
var shell = require('shelljs');
shell.config.execPath = '/usr/bin/node';
var hash = shell.exec(' cd ~/'+config.name+' && git log | head -n 1 | cut -c8-47', {silent:true});
let SSHDirectory = shell.exec('echo $HOME', {silent:true}).replace('\n', '').replace('\r', '');
    

//var Dname = exec('pwd | sed \'s#.*/##\'', { silent: true }).replace('\n', '').replace('\r', '');

var sshconfig = {
    host: config.host,
    username: config.user,
    identity:  ''+SSHDirectory+'/.ssh/id_rsa'
  }
  var ssh = new SSH2Promise(sshconfig);


//Test ping sur l'ip du serveur
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
    let olddirl = await ssh.exec('cd /var/www/' + config.name + ' && ls -tl | tail -n 1 | cut -c42-96');
    $( ".response" ).append( "<p>Le dossier le plus vieux est : "+olddirl+"</p>" );
        console.log('Le dossier le plus vieux est : ' + olddirl);
        olddir = olddirl;
        await RemoveOld();
}

//Fonction appelée dans Olddirectory, elle supprime le vieux dossier s'il y a + de 10 sous dossiers dans le projets
let RemoveOld = async ()=> {
    if (olddir == null || olddir == ''){
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
        $( ".response" ).append( "<p>Impossible de supprimer le dossier : "+olddir+" vérifier les droits </p>" );
           console.log(error.toString('utf8'));
       }
    }
}


//Clone du projet dans /var/www/project/hash
let gitclone = async ()=> {
    try{
        await ssh.exec(' git clone ' + config.github + '/' + config.name + ' /var/www/' + config.name + '/'+hash.replace('\n', '').replace('\r', ''));
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
        await npm();
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
        //FIXME: Tous les projets devront se trouver en ~ si on laisse la fonction comme ça
        await shell.exec('scp -r -p  ~/'+config.name+'/mongoUpdate ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', ''), { silent: true });
        $( ".response" ).append( "<p>Le dossier mongoUpdate à été transmis sur le serveur</p>" );
    }
    catch(error){
        $( ".response" ).append( "<p>Erreur lors du transfert, votre dossier se trouve bien en ~/Nom_du_projet</p>" );
        console.log(error.toString('utf8')); 
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
        shell.exec('scp -r -p /tmp/' + config.db + ' ' + config.user + '@' + config.host + ':/var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/database', { silent: true });
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
        console.log('Paquets npm installés');
        $( ".response" ).append( "<p>NPM installés </p>" );
        await pm2Stop();
    }
    catch(error){
        console.log(error.toString('utf8'));
        console.log('Paquets NPM déjà installés');
        $( ".response" ).append( "<p>NPM installé </p>" );
        await pm2Stop();
    }
}

//Stop le processus PM2 portant le nom du projet
let pm2Stop = async () =>{
    try{
        await ssh.exec('pm2 stop ' + config.name)
        $( ".response" ).append( "<p>PM2 Stop </p>" );
        console.log('PM2 stopper');
        await pm2Delete();
    }
    catch(error){
        console.log(error.toString('utf8'));
        $( ".response" ).append( "<p>Pas de processus PM2 actif pour ce nom de projet </p>" );
        console.log('Il n\'y a pas de process actif pour ce projet');
        await pm2Delete();
      }  
}


//Supprime le conteneur pm2 portant le nom du projet
let pm2Delete = async ()=> {
        try{
            await ssh.exec('pm2 delete ' + config.name)
            $( ".response" ).append( "<p>PM2 Delete </p>" );
            console.log('PM2 supprimer');
            await pm2Start();
        }
        catch(error){
            console.log(error.toString('utf8'));
            $( ".response" ).append( "<p>Pas de processus PM2 supprimable pour ce nom de projet </p>" );
            console.log('Il n\'y a pas de process supprimable pour ce projet');
            await pm2Start();
          }  
}


/* Attention il faut installer : "npm i -g babel-cli" car pm2 à des soucis de compréhension avec node */
//Démarre le process grâce au fichier app.js situer dans /app
let pm2Start = async ()=> {
    try {
    await ssh.exec('pm2 start /var/www/' + config.name + '/' + hash.replace('\n', '').replace('\r', '') + '/app.js --name=' + config.name)
        console.log('PM2 Démarrer');
        $( ".response" ).append( "<p>PM2 Start </p>" );
       
    }
    catch(error){
        console.log(error.toString('utf8'));
        $( ".response" ).append( hash.replace('\n', '').replace('\r', '') );
        $( ".response" ).append( "<p>Une erreur est survenue lors du démarrage du processus PM2 </p>" );
        
    }
}

let globalInit = async() =>
{

    await isInstalled();
    await testDir();
    await clone();
    await gitclone();
    setTimeout(Db,6000);
   
}

/* ------------------------------------------------------------------------------------Partie Revert-------------------------------------------------------------------*/
//Listing des versions que l'on peut Revert
var numberRevert=2;
let revert = async ()=> {
    console.log(numberRevert);
    let data =  await ssh.exec("cd /var/www/" + config.name + " && ls -l | nl | head -n "+numberRevert+ " | tail -1");
       console.log(data);
       $( ".response" ).append("<div>"+data+"</div>");
       numberRevert++;
       if (numberRevert<11){
        revert();
        
       }
       else{
        numberRevert=2;
       }
}
      

//Récupération du nom de dossier à Revert
let rhash = async ()=> {
    var number = $('#NRevert').val();
    console.log(number);
    if (number==""){
        $( ".response" ).append("<div>Attention vous n'avez pas renseigné de numéro de version à Revert</div>");
    }
    else if(number=="0" || number =="1"){
        $( ".response" ).append("<div>Attention vous ne pouvez pas choisir un numéro entre 0 et 1</div>");
    }
    else{
        let rhash = await ssh.exec("cd /var/www/" + config.name + " && ls -l | head -n " + number + " | tail -n 1 | cut -c42-88");
        $( ".response" ).append("<div>la version suivante sera revert : "+rhash+"</div>");
        console.log('La version suivantes sera revert :' + rhash);
            hashToRevert = rhash;
    }
}


//Fonction qui supprime l'ancienne DB
let Mongodelete = async ()=> {
   await ssh.exec('mongo ' + config.db + ' --eval "db.dropDatabase()"');
   $( ".response" ).append( "<p> Base de données "+config.db+" mongo supprimée </p>" );
       console.log('Ancienne db supprimée'); 
}


//Fonction qui va restore la DB de la version à Revert, elle utilise le dossier database présent dans /var/www/project/database
let Mongocreate = async ()=> {
   try{
       await ssh.exec('mongorestore --db ' + config.db + ' /var/www/' + config.name + '/' + hashToRevert.replace('\n', '').replace('\r', '') + '/database/'+config.db);
       $( ".response" ).append( "<p> La base de données de la version à revert à étée restorée </p>" );
       console.log('DB restore');
   }
   catch(error){
    $( ".response" ).append( "<p> La base de données à été restorées </p>" );
       console.log(error.toString('utf8'));
   }
}

//Stop le processus PM2 portant le nom du projet
let pm2StopR = async () =>{
    try{
        await ssh.exec('pm2 stop ' + config.name)
        $( ".response" ).append( "<p>PM2 Stop </p>" );
        console.log('PM2 stopper');
        
    }
    catch(error){
        console.log(error.toString('utf8'));
        $( ".response" ).append( "<p>Pas de processus PM2 actif pour ce nom de projet </p>" );
        console.log('Il n\'y a pas de process actif pour ce projet');
        
      }  
}


//Supprime le conteneur pm2 portant le nom du projet
let pm2DeleteR = async ()=> {
        try{
            await ssh.exec('pm2 delete ' + config.name)
            $( ".response" ).append( "<p>PM2 Delete </p>" );
            console.log('PM2 supprimer');
            
        }
        catch(error){
            console.log(error.toString('utf8'));
            $( ".response" ).append( "<p>Pas de processus PM2 supprimable pour ce nom de projet </p>" );
            console.log('Il n\'y a pas de process supprimable pour ce projet');
            
          }  
}


//Fonction qui va démarrer le processus pm2 de la version a revert
let pm2StartR = async ()=> {
   try {
       //FIXME: Endroit du script app.js
   await ssh.exec('pm2 start /var/www/' + config.name + '/' + hashToRevert.replace('\n', '').replace('\r', '') + '/app.js --name=' + config.name)
   $( ".response" ).append( "<p>PM2 Démarrer </p>" );
       console.log('PM2 Démarrer');
       
   }
   catch(error){
       console.log(error.toString('utf8'));
       $( ".response" ).append( "<p>Une erreur est survenue dans le démarrage de l'app.js , vérifier le chemin dans le code </p>" );
      
   }
}


let globalRevert = async() =>
{
    await isInstalled();
    await rhash();
    if (($('#rbOui').is(':checked'))) {
        console.log('rb oui est coché');
        await Mongodelete();
        await Mongocreate();
        await pm2StopR();
        await pm2DeleteR();
        await pm2StartR();
    }
    else{
       console.log('rb non cohé');
        await pm2StopR();
        await pm2DeleteR();
        await pm2StartR();
    }
}