var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    port = process.env.PORT || 3001 //for heroku,
    //port = 3002,
    TeamSpeakClient = require("node-teamspeak"),
    util = require("util"),
    cl = undefined,
    fs = require('fs'),
    devmode = false,
    server_version='0.1.5',
    server_qname='ts3wi-nodejs public ';
app.use(express.static(__dirname + '/site'));
require('./fs.removeRecursive.js');

// FTP remote logs system
// not 100% sure what should be async and what shouldn't in this, but seems to work for now
var FTPClient = require('ftp'),
    cronJob = require('cron').CronJob,
    crypto = require('crypto'),
    fstream = require('fstream'),
    zlib = require('zlib'),
    tar = require('tar'),
    key = process.env.CipherKey,
    cipher = crypto.createCipher('aes-256-cbc', key),
    ftpTime = '00 */25 * * * *';
console.log('FTP Runtime: '+ftpTime);
var job = new cronJob({
    cronTime: ftpTime,
    onTick: function() {
        var ftpcreds = {site:process.env.FTPsite,user:process.env.FTPuser,pass:process.env.FTPpass};
        var c = new FTPClient();
        var d = new Date();
        var d0 = 'logs_'+d.getDate().toString()+'_'+(d.getMonth()+1)+'_'+d.getFullYear()+'-'+d.getHours()+'_'+d.getMinutes()+'_'+d.getSeconds()+'.tar.gz.en';
        console.log("FTP: Starting '"+ftpTime+"' run at "+d);
        c.on('ready', function() {
            console.log('FTP:     at '+ftpcreds['site']+' updating: "'+d0+'" ('+(fs.statSync("./upload/"+d0)['size'])+'B)');
            c.put('./upload/'+d0,d0,function(err){
                if (err) throw console.log(err);
                c.end();
                console.log('FTP: Deleting "'+d0+'" ...');
                fs.unlink('./upload/'+d0, (err) => {
                    if (err) throw err;
                    console.log('FTP: Successfully deleted "./upload/'+d0+'"');
                    console.log('FTP: Finished FTP upload: '+new Date());
                });
            });
        });
        c.on('error',function(err){console.log(err);});
        c.on('end',function(){ console.log('FTP: Connection closed.'); });
        fs.readdir('./logs2', function(err, files) {
            if (err) {
                //console.log(err); // Usually a "no such directory" error
                console.log('FTP: No "./logs2" directory.');
                fs.readdir('./logs', function(err, files) {
                    if (err) {
                       //console.log(err); // Usually a "no such directory" error
                       console.log('FTP: No files to upload.');
                    } else {
                        if (!files.length) {
                            console.log('FTP: No files to upload.');
                        } else {
                            fs.rename('logs','logs2', function(err, files) {
                                if (err) {
                                   console.log(err);
                                } else {
                                    console.log('FTP: Files in "./logs2" being packaged.');
                                    var encryp = fstream.Reader({ 'path': './logs2', 'type': 'Directory' })
                                    .pipe(tar.Pack()).pipe(zlib.Gzip({level: 5 }))
                                    .pipe(cipher)
                                    .pipe(fstream.Writer({ 'path': './upload/'+d0 }));
                                    encryp.on('close', function () {
                                        console.log('FTP: Finished packing: "'+d0+'"');
                                        fs.removeRecursive('./logs2',function(err,status){
                                            if (err) {
                                               console.log(err);
                                            } else {
                                                if (status) {console.log('FTP: Temp "./logs2" deleted.')}
                                                else {console.log('FTP: Temp "./logs2" was NOT deleted!');} 
                                            }
                                            });
                                        c.connect({host:ftpcreds['site'],port:'21',user:ftpcreds['user'],password:ftpcreds['pass']});
                                    });
                                }
                            });
                        }
                    }
                });
            } else {
                if (!files.length) {
                    console.log('FTP: No files to upload.');
                    fs.rmdir('./logs2',function(err){if(err!=null)console.log(err); });
                } else {
                    d0='err_'+d0;
                    console.log('FTP: Files in "./logs2" being packaged.');
                    var encryp = fstream.Reader({ 'path': './logs2', 'type': 'Directory' })
                    .pipe(tar.Pack()).pipe(zlib.Gzip({level: 5 }))
                    .pipe(cipher)
                    .pipe(fstream.Writer({ 'path': './upload/'+d0 }));
                    encryp.on('close', function () {
                        console.log('FTP: Finished packing: "'+d0+'"');
                        fs.removeRecursive('./logs2',function(err,status){
                            if (err) {
                               console.log(err);
                            } else {
                                if (status) {console.log('FTP: Temp "./logs2" deleted.')}
                                else {console.log('FTP: Temp "./logs2" was NOT deleted!');} 
                            }
                        });
                        c.connect({host:ftpcreds['site'],port:'21',user:ftpcreds['user'],password:ftpcreds['pass']});
                    });
                }
            }
        });
    },
    start: false,
    timeZone: "Australia/Queensland"
});
job.start();
    
        /*
        Version: 0.1.5
        GitHub version has removed:
            default password (server.js)
            port difference (server.js)
            large commented out sections
            alternate domain addresses (dev)
            live.js file (index.html)
            changed wording from private to public (server.js and index.html)
            cdn.socket.io needs to be removed from github preview version
        Todo list:
            ping for closest server (update from http accessed list)
            add donation link
            auto upload a version to the preview site (probs link javascript file to github)
            check if IPv6 works
            add abuse thresholds (spamming commands)
            better/prettier channel view
            better/prettier client view
            css theme
            move clients around
            check if succesful creds are already in the file
            better jsvascript management (defs.js and a seperate file for the core js)
            find why the FTP connection takes so long to close after uploading a file
            fix heroku icon download, misses parts of the file... -_- (find a way to detect incomplete files)
        */
        
        //comment out for heroku, so only GitHub is the host.
server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

var commands = ["help","quit","login","logout","version","hostinfo","instanceinfo","instanceedit","bindinglist","use",
"serverlist","serveridgetbyport","serverdelete","servercreate","serverstart","serverstop","serverprocessstop","serverinfo",
"serverrequestconnectioninfo","serveredit","servergrouplist","servergroupadd","servergroupdel","servergroupcopy","servergrouprename",
"servergrouppermlist","servergroupaddperm","servergroupdelperm","servergroupaddclient","servergroupdelclient","servergroupclientlist",
"servergroupsbyclientid","servergroupautoaddperm","servergroupautodelperm","serversnapshotcreate","serversnapshotdeploy",
"servernotifyregister","servernotifyunregister","sendtextmessage","logview","logadd","gm","channellist","channelinfo","channelfind",
"channelmove","channelcreate","channeldelete","channeledit","channelgrouplist","channelgroupadd","channelgroupdel","channelgroupcopy",
"channelgrouprename","channelgroupaddperm","channelgrouppermlist","channelgroupdelperm","channelgroupclientlist",
"setclientchannelgroup","channelpermlist","channeladdperm","channeldelperm","clientlist","clientinfo","clientfind","clientedit",
"clientdblist","clientdbinfo","clientdbfind","clientdbedit","clientdbdelete","clientgetids","clientgetdbidfromuid",
"clientgetnamefromuid","clientgetnamefromdbid","clientsetserverquerylogin","clientupdate","clientmove","clientkick","clientpoke",
"clientpermlist","clientaddperm","clientdelperm","channelclientpermlist","channelclientaddperm","channelclientdelperm",
"permissionlist","permidgetbyname","permoverview","permget","permfind","permreset","privilegekeylist","privilegekeyadd",
"privilegekeydelete","privilegekeyuse","messagelist","messageadd","messagedel","messageget","messageupdateflag","complainlist",
"complainadd","complaindelall","complaindel","banclient","banlist","banadd","bandel","bandelall","ftinitupload","ftinitdownload",
"ftlist","ftgetfilelist","ftgetfileinfo","ftstop","ftdeletefile","ftcreatedir","ftrenamefile","customsearch","custominfo","whoami"];

function getDateTime() {
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
}

var Smessage = function(socket,msg) {
    if (socket.username) { //if user system was to ever be implimented
        console.log(getDateTime()+' ID: '+socket['id']+' User: '+ socket.username+' '+msg);
    } else {
        console.log(getDateTime()+' Address: '+socket['client']['conn']['remoteAddress']+' '+msg);
    }
};
//var clients = [];
io.on('connection', function (socket) {
    var loggedin = false;
    //console.log(socket);
    //console.log(socket.id);
    //clients.push(socket);
    
    var logme = function(line,err,response,rawResponse,comment) {
        var dir = './logs';
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir); }
        
        if (devmode) {
            try {console.log('error200: \n'+err+'\n'+response+'\n'+rawResponse);} catch(rr) { console.log(rr); }
            
            if (typeof err == 'object')
                console.log(util.inspect(err));
        }
        // maybe REMOVE 'line' for security reasons
        var msgg = 'Error: line: ['+line+'] id: ['+err['id']+'] msg: ['+err['msg']+'] extra_msg: ['+err['extra_msg']+']';
        if (response!=undefined)
            msgg +='\n   Response: '+response;
        if (rawResponse!=undefined)
            msgg +=' Raw Response: '+rawResponse;
        if (comment!=undefined)
            msgg+= ' '+comment;
        io.to(socket.id).emit('message',{msg:msgg});
        
        if (err['msg']=='invalid loginname or password'||err['msg']=='connection failed, you are banned') return;
        
        console.log('Writing to file: ');
        var a = '\n['+getDateTime()+'] L:'+line+' E: '+err;
        if (response!=undefined)
            a +=' R: '+response;
        if (rawResponse!=undefined)
            a +=' RR: '+rawResponse;
        if (comment!=undefined)
            a+= ' '+comment;
        console.log(a);
        if (cl==undefined) cl=[];
        var se = cl.server||'NotLoggedIn1',
            po = cl.portt||'00001';
        fs.appendFile(dir+'/'+se.toString()+':'+po.toString()+'.log',a, "ascii", function(err) {
            if(err) {
                return console.log(err);
            }
        });
        return;
    };
    io.to(socket.id).emit('message',{msg:'Hello from '+server_qname+'server version: '+server_version});
    socket.on('disconnect', function () {
        //clients.splice(clients.indexOf(socket), 1);
    });
    //console.log(socket.client);
    //console.log('Connection from: '+socket['client']['request']['headers']['referer']);
    Smessage(socket,'is '+socket['id']+' and at '+socket['client']['request']['headers']['referer']);
    socket.on('ping1', function (data) {
        if (data['type']=='hello') {
            io.to(socket.id).emit('ping2', {type: 'hello', msg: server_qname+'server version: '+server_version} );
        }
    });
    socket.on("error", function(err){ // Should add limits for port ranges and handle close for each client
    	io.to(socket.id).emit('message',{msg:'Error: '+err+'\n(You may need to refresh your page.)'});
        logme(253,err);
    	//io.close();
    });
    socket.on('login', function (data) {
        if (devmode) console.log(data);
        if (data['pass']==''||data['server']==''||data['username']=='') {
            io.to(socket.id).emit('message',{msg:'Error: No address and/or username and/or password received.'});
            return;
        }
        var cl1 = new TeamSpeakClient(data['server'],data['port']);
        cl1.on("error", function(err){
            if (devmode) console.log(err); //Remove once testing is done
        	io.to(socket.id).emit('message',{msg:'Error: code: ['+err['code']+'] port: ['+err['port']+']\n'+'('+err+')'});
            logme(262,err);
        });
        cl1.send("login", {client_login_name: data['username'], client_login_password: data['pass']}, function(err, response, rawResponse){
            if (devmode) {
                console.log(err);
                console.log(response);
                console.log(rawResponse);
            }
            if (err!=undefined) {
                logme(271,err,response,rawResponse,'Bad login?? Check your password etc.');
                // old error method
                //io.to(socket.id).emit('message',{msg:'Error: id: ['+err['id']+'] msg: ['+err['msg']+'] extra_msg: ['+err['extra_msg']+']'});
            } else {
                io.to(socket.id).emit('message',{msg:'Login succesful.',type:'loginsuc'});
                cl = new TeamSpeakClient(data['server'],data['port']);
                loggedin=true;
                cl.server=data['server'];
                cl.portt=data['port'];
                cl.username=data['username'];
                cl.pass=data['pass'];
                //cl.setTimeout(5000);
                return;
            }
        });
    });
    socket.on('query', function (data) {
        if (devmode) {
            console.log('NEW QUERY--------------------------------------');
            console.log(data);
            console.log(cl);
        }
        if (!loggedin) {
            io.to(socket.id).emit('message',{msg:'Error: You are not logged in.'});
            return;
        }
        if (commands.indexOf(data['cmd'])==-1) {
            io.to(socket.id).emit('message',{msg:'Error: Command ['+data['cmd']+'] is not in the whitelist.'});
            return;
        }
        if (data['sid']==undefined) {
            if (data['cmd']=='serverlist') {
                cl.send("login", {client_login_name: cl.username, client_login_password: cl.pass}, function(err, response, rawResponse){
                    if (err!=undefined) {
                        logme(318,err,response,rawResponse);
                        return;
                    } else {
                        cl.send("serverlist",data['params'], function(err, response, rawResponse){
                            if (err!=undefined) {
                                logme(324,err,response,rawResponse);
                                return;
                            } else {
                                io.to(socket.id).emit('message',{type:data['cmd'],data:response});
                                cl.send("logout", function(err, response, rawResponse){
                                    if (devmode&&err!=undefined) console.log('error12: \n'+err+'\n'+response+'\n'+rawResponse);
                                    return;
                                });
                            }
                        });
                    }
                });
                return;
            }
            io.to(socket.id).emit('message',{msg:'Error: Virtual server not selected.'});
            return;
        }
        cl.send("login", {client_login_name: cl.username, client_login_password: cl.pass}, function(err, response, rawResponse){
            if (err!=undefined) {
                logme(344,err,response,rawResponse);
                return;
            } else {
                cl.send("use", {sid: data['sid']}, function(err, response, rawResponse){
                    if (err!=undefined){
                        console.log('error1: \n'+err+'\n'+response+'\n'+rawResponse);
                        logme(350,err,response,rawResponse);
                        return;
                    }
                    //Update name, needs to be put somwhere useful
                    cl.send("clientupdate", {'client_nickname':server_qname+server_version+' - '+Math.floor(Math.random()*100)}, function(err, response, rawResponse){
                        if (err!=undefined) {
                            logme(357,err,response,rawResponse);
                            return;
                        } else {
                            cl.send(data['cmd'],data['params'], function(err, response3, rawResponse){
                                if (err!=undefined) {
                                    console.log('error2: \n'+err+'\n'+response3+'\n'+rawResponse);
                                    logme(363,err,response3,rawResponse);
                                    return;
                                } else {
                                if (devmode) console.log(util.inspect(response));
                                cl.send("logout", function(err, response, rawResponse){
                                    if (err!=undefined) {
                                        //logme(369,err,response,rawResponse);
                                    }
                                    
                                    io.to(socket.id).emit('message',{type:data['cmd'],msg:response3});
                                    return;
                                });
                                return;
                                }
                            });
                        }
                    });
                });
            }
        });
    });
    socket.on('update_vserver_bcontent', function (data) { //idea canned
        if (!loggedin) {
            io.to(socket.id).emit('message',{msg:'Error: You are not logged in.'});
            return;
        }
        cl.send("login", {client_login_name: cl.username, client_login_password: cl.pass}, function(err, response, rawResponse){
            if (err!=undefined) {
                logme(392,err,response,rawResponse);
                return;
            } else {
                //Update name, needs to be put somwhere useful
                cl.send("clientupdate", {'client_nickname':server_qname+server_version}, function(err, response, rawResponse){
                    if (err!=undefined) {
                        logme(399,err,response,rawResponse);
                        return;
                    } else {
                        cl.send("use", {sid: data['sid']}, function(err, response, rawResponse){
                            if (err!=undefined){
                                console.log('error1: \n'+err+'\n'+response+'\n'+rawResponse);
                                logme(405,err,response,rawResponse);
                            }
                            cl.send("channellist",data['params'], function(err, response, rawResponse){
                                console.log('error2: \n'+err+'\n'+response+'\n'+rawResponse);
                                console.log(util.inspect(response));
                                io.to(socket.id).emit('message',{type:data['cmd'],msg:response});
                                return;
                            });
                        });
                        cl.send("ftgetfilelist",data['params'], function(err, response1, rawResponse){
                            if (err!=undefined) {
                                logme(416,err,response,rawResponse);
                                return;
                            } else {
                                var dir = "./site/"+cl.server.toString()+':'+cl.portt.toString();
                                if (!fs.existsSync(dir)){
                                    fs.mkdirSync(dir);
                                }
                                //console.log("Retrieving icons: "+response1.length);
                                io.to(socket.id).emit('message',{msg:'Server: Retrieving icons: '+response1.length +'...'});
                                var icon_num =0;
                                var next_icon = function (ico=0) {
                                    //console.log(ico);
                                    fs.open(dir+"/"+response1[ico]['name'], 'r+', function(err, fd) {
                                        if (err) {
                                            if (err['errno']==-2) {
                                                console.log("Downloading file: "+icon_num);
                                                cl.send("ftinitdownload",{'clientftfid':Math.floor((Math.random() * 98) + 1),"name":"/"+response1[ico]['name'],"cid":0,"cpw":'',"seekpos":1}, function(err, response, rawResponse){
                                                //cl.send("ftinitdownload",{'clientftfid':Math.floor((Math.random() * 98) + 1),"name":"/icon_28392483","cid":0,"cpw":'',"seekpos":1}, function(err, response, rawResponse){
                                                    if (err!=undefined) {
                                                        logme(436,err,response,rawResponse);
                                                        return;
                                                    } else {
                                                        //getting icons should go here
                                                        const net = require('net');
                                                        const client = net.createConnection({host:cl.server,port: response['port']}, () => {
                                                            //'connect' listener
                                                            //console.log('connected to server!');
                                                            client.write(response['ftkey']);
                                                        });
                                                        client.on('data', (data1) => { //Doesn't recieve first byte of data ??? WTF? maybe becuase there's no chunck control...
                                                            var b = Buffer.from('/w==', 'base64'); //JIFF files
                                                            var d =data1.toString();
                                                            if (d[0]=='P'&&d[1]=='N'&&d[2]=='G') {
                                                                b = Buffer.from('iQ==', 'base64'); //PNG files
                                                            }
                                                            if (d[0]=='I'&&d[1]=='F') {
                                                                b = Buffer.from('Rw==', 'base64'); //GIF files
                                                            }
                                                            fs.writeFile(dir+"/"+response1[ico]['name'], Buffer.concat([b,data1]), "ascii", function(err) {
                                                                if(err) {
                                                                    return console.log(err);
                                                                }
                                                                //console.log("The file was saved!");
                                                            }); 
                                                        });
                                                        client.on('end', () => {
                                                            //console.log('disconnected from server');
                                                            if (icon_num == response1.length-1) {
                                                                io.to(socket.id).emit('message',{msg:'Server: Finished retrieving icons: '+response1.length});
                                                                return;
                                                            }
                                                            next_icon(icon_num);
                                                            icon_num++;
                                                        });
                                                    }
                                                });
                                            }
                                            return;
                                        }
                                        //console.log("File opened successfully! " +icon_num);
                                        if (icon_num == response1.length-1) {
                                            io.to(socket.id).emit('message',{msg:'Server: Finished retrieving icons: '+response1.length});
                                            return;
                                        }
                                        next_icon(icon_num);
                                        icon_num++;
                                    });
                                };
                                next_icon(0);
                            }
                        });
                    }
                });
            }
        });
        return;
    });
    socket.on('update_vserver_icons', function (data) {
        if (!loggedin) {
            io.to(socket.id).emit('message',{msg:'Error: You are not logged in.'});
            return;
        }
        cl.send("login", {client_login_name: cl.username, client_login_password: cl.pass}, function(err, response, rawResponse){
            if (err!=undefined) {
                logme(501,err,response,rawResponse);
                return;
            } else {
                cl.send("use", {sid: data['sid']}, function(err, response, rawResponse){
                    if (err!=undefined){
                        console.log('error1: \n'+err+'\n'+response+'\n'+rawResponse);
                        logme(350,err,response,rawResponse);
                        return;
                    }
                    //Update name, needs to be put somwhere useful
                    cl.send("clientupdate", {'client_nickname':server_qname+server_version+' - '+Math.floor(Math.random()*100)}, function(err, response, rawResponse){
                        if (err!=undefined) {
                            logme(508,err,response,rawResponse);
                            return;
                        } else {
                            cl.send("ftgetfilelist",data['params'], function(err, response1, rawResponse){
                                if (err!=undefined) {
                                    logme(514,err,response1,rawResponse);
                                    return;
                                } else {
                                    var dir = "./site/"+cl.server.toString()+':'+cl.portt.toString();
                                    if (!fs.existsSync(dir)){
                                        fs.mkdirSync(dir);
                                    }
                                    //console.log("Retrieving icons: "+response1.length);
                                    io.to(socket.id).emit('message',{msg:'Server: Retrieving icons: '+response1.length +'...'});
                                    var icon_num =0;
                                    var next_icon = function (ico=0) {
                                        //console.log(ico);
                                        fs.open(dir+"/"+response1[ico]['name'], 'r+', function(err, fd) {
                                            if (err) {
                                                if (err['errno']==-2) {
                                                    console.log("Downloading file: "+icon_num);
                                                    cl.send("ftinitdownload",{'clientftfid':Math.floor((Math.random() * 98) + 1),"name":"/"+response1[ico]['name'],"cid":0,"cpw":'',"seekpos":1}, function(err, response, rawResponse){
                                                    //cl.send("ftinitdownload",{'clientftfid':Math.floor((Math.random() * 98) + 1),"name":"/icon_28392483","cid":0,"cpw":'',"seekpos":1}, function(err, response, rawResponse){
                                                        if (err!=undefined) {
                                                            logme(534,err,response,rawResponse);
                                                            return;
                                                        } else {
                                                            //getting icons should go here
                                                            const net = require('net');
                                                            const client = net.createConnection({host:cl.server,port: response['port']}, () => {
                                                                //'connect' listener
                                                                client.write(response['ftkey']);
                                                            });
                                                            client.on('data', (data1) => { //Doesn't recieve first byte of data ??? WTF? maybe becuase there's no chunck control...
                                                                var b = Buffer.from('/w==', 'base64'); //JIFF files
                                                                var d =data1.toString();
                                                                if (d[0]=='P'&&d[1]=='N'&&d[2]=='G') {
                                                                    b = Buffer.from('iQ==', 'base64'); //PNG files
                                                                }
                                                                if (d[0]=='I'&&d[1]=='F') {
                                                                    b = Buffer.from('Rw==', 'base64'); //GIF files
                                                                }
                                                                fs.writeFile(dir+"/"+response1[ico]['name'], Buffer.concat([b,data1]), "ascii", function(err) {
                                                                    if(err) {
                                                                        return console.log(err);
                                                                    }
                                                                    //console.log("The file was saved!");
                                                                }); 
                                                            });
                                                            client.on('error', (error) => { //doesn't work, heroku still fails to download some icons
                                                                console.log(error);
                                                                if (true) {
                                                                    console.log('Error downloading icon, retyring...');
                                                                    next_icon(icon_num);
                                                                }
                                                            });
                                                            client.on('end', () => {
                                                                //console.log('disconnected from server');
                                                                if (icon_num == response1.length-1) {
                                                                    io.to(socket.id).emit('message',{msg:'Server: Finished retrieving icons: '+response1.length});
                                                                    return;
                                                                }
                                                                next_icon(icon_num);
                                                                icon_num++;
                                                            });
                                                        }
                                                    });
                                                }
                                                return;
                                            }
                                            //console.log("File opened successfully! " +icon_num);
                                            if (icon_num == response1.length-1) {
                                                io.to(socket.id).emit('message',{msg:'Server: Finished retrieving icons: '+response1.length});
                                                return;
                                            }
                                            next_icon(icon_num);
                                            icon_num++;
                                        });
                                    };
                                    next_icon(0);
                                }
                            });
                        }
                    });
                });
            }
        });
        return;
    });
    // not used for now
    socket.on('updateicons', function (data) {
        console.log(data);
        console.log(loggedin);
        console.log(cl);
        if (!loggedin) {
            io.to(socket.id).emit('message',{msg:'Error: You are not logged in.'});
            return;
        }
        cl.send("login", {client_login_name: cl.username, client_login_password: cl.pass}, function(err, response, rawResponse){
            cl.send("use", {sid: 1}, function(err, response, rawResponse){
                console.log('error1: ');
                console.log(err);
                console.log(response);
                console.log(rawResponse);
                cl.send("servernotifyregister",{event:'server'}, function(err, response, rawResponse){
                    console.log(util.inspect(response));
                    console.log(err);
                    console.log(response);
                    console.log(rawResponse);
                    //io.to(socket.id).emit('message',{msg:list});
                    cl.on('notifyclientmove',function (data, data1, data2){
                        console.log("BBBBBBBBBBBBBBBBBBBBBB");
                        console.log(data);
                        console.log(data1);
                        console.log(data2);
                    });
                    cl.on('connect',function (data, data1, data2){
                        console.log("BBBBBBBBBBBBBBBBBBBBBB");
                        console.log(data);
                        console.log(data1);
                        console.log(data2);
                    });
                });
            });
        });
    });
});