var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io')(server),
    port = process.env.PORT || 3001,
    TeamSpeakClient = require("node-teamspeak"),
    util = require("util"),
    cl = undefined;
app.use(express.static(__dirname + '/site'));

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
    if (socket.username) {
        console.log(getDateTime()+' ID: '+socket['id']+' User: '+ socket.username+' '+msg);
    } else {
        console.log(getDateTime()+' Address: '+socket['client']['conn']['remoteAddress']+' '+msg);
    }
};
//var clients = [];
io.on('connection', function (socket) {
    var loggedin = false;
    console.log(socket);
    console.log(socket.id);
    //clients.push(socket);
    io.to(socket.id).emit('message',{msg:'Error: Hello from public server'});
    socket.on('disconnect', function () {
        //clients.splice(clients.indexOf(socket), 1);
    });
    //console.log(socket.client);
    //console.log('Connection from: '+socket['client']['request']['headers']['referer']);
    Smessage(socket,'is '+socket['id']+' and at '+socket['client']['request']['headers']['referer']);
    socket.on('ping1', function (data) {
        if (data['type']=='hello') {
            io.to(socket.id).emit('ping2', {type: 'hello', msg: 'ts3wi-nodejs public server'} );
        }
    });
    socket.on("error", function(err){ // Should add limits for port ranges and handle close for each client
    	io.to(socket.id).emit('message',{msg:'Error: '+err+'\n(You may need to refresh your page.)'});
    	//io.close();
    });
    socket.on('login', function (data) {
        console.log(data);
        var cl1 = new TeamSpeakClient(data['server'],data['port']);
        cl1.on("error", function(err){
            console.log(err); //Remove once testing is done
        	io.to(socket.id).emit('message',{msg:'Error: code: ['+err['code']+'] port: ['+err['port']+']\n'+'('+err+')'});
        });
        cl1.send("login", {client_login_name: data['username'], client_login_password: data['pass']}, function(err, response, rawResponse){
        //cl1.send("login", {client_login_name: data['username'], client_login_password: data['pass']}, function(err, response, rawResponse){
            console.log(err);
            console.log(response);
            console.log(rawResponse);
            if (err!=undefined) {
                io.to(socket.id).emit('message',{msg:'Error: id: ['+err['id']+'] msg: ['+err['msg']+'] extra_msg: ['+err['extra_msg']+']'});
            } else {
                io.to(socket.id).emit('message',{msg:'Login succesful.',type:'loginsuc'});
                cl = new TeamSpeakClient(data['server'],data['port']);
                loggedin=true;
                cl.server=data['server'];
                cl.portt=data['port'];
                cl.username=data['username'];
                cl.pass=data['pass'];
                
                console.log(cl);
            }
        });
    });
    socket.on('query', function (data) {
        console.log('NEW QUERY');
        console.log(data);
        console.log(cl);
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
                        io.to(socket.id).emit('message',{msg:'Error: id: ['+err['id']+'] msg: ['+err['msg']+'] extra_msg: ['+err['extra_msg']+']'});
                        return;
                    } else {
                        cl.send("serverlist", function(err, response, rawResponse){
                            if (err!=undefined) {
                                io.to(socket.id).emit('message',{msg:'Error: id: ['+err['id']+'] msg: ['+err['msg']+'] extra_msg: ['+err['extra_msg']+']'});
                                return;
                            } else {
                                io.to(socket.id).emit('message',{type:data['cmd'],data:response});
                                //io.to(socket.id).emit('serverlist',{type:'serverlist',data:response});
                            }
                        });
                    }
                });
                return;
            }
            io.to(socket.id).emit('message',{msg:'Error: Virtual server not selected.'});
            return;
        }
        if (data['cmd']=='ftinitdownload') {
            cl.send("login", {client_login_name: cl.username, client_login_password: cl.pass}, function(err, response, rawResponse){
                if (err!=undefined) {
                    io.to(socket.id).emit('message',{msg:'Error: id: ['+err['id']+'] msg: ['+err['msg']+'] extra_msg: ['+err['extra_msg']+']'});
                    return;
                } else {
                    //cl.send("ftgetfilelist",data['params'], function(err, response, rawResponse){
                    cl.send("ftinitdownload",{'clientftfid':Math.floor((Math.random() * 98) + 1),"name":"/icon_28392483","cid":0,"cpw":'',"seekpos":1}, function(err, response, rawResponse){
                        if (err!=undefined) {
                            io.to(socket.id).emit('message',{msg:'Error: id: ['+err['id']+'] msg: ['+err['msg']+'] extra_msg: ['+err['extra_msg']+']'});
                            return;
                        } else {
                            io.to(socket.id).emit('message',{type:data['cmd'],data:response});
                            //io.to(socket.id).emit('serverlist',{type:'serverlist',data:response});
                            //getting icons should go here
                            
                            const net = require('net');
                            var file = '';
                            const client = net.createConnection({ip:data['server'],port: response['port']}, () => {
                                //'connect' listener
                                console.log('connected to server!');
                                client.write(response['ftkey']);
                            });
                            client.on('data', (data) => {
                                console.log('DATA BACK FROM FILES');
                                var c = new Buffer(data.toString('ascii'));
                                console.log(data);
                                console.log(data.length);
                                var output = [];
                                for(var i = 0; i < data.length; i++){
                                    output[i] = data.toString('hex',i,i+1); // i is byte index of hex
                                    //output.push(char);
                                };
                                console.log(typeof output);
                                var aaa = ['ff,'];
                                var bbb= [];
                                bbb = aaa+output;
                                console.log(bbb);
                                //console.log(bbb.split(','));
                                console.log(Buffer.from(bbb.split(','),'binary'));
                                console.log(c.writeInt8('ff', 0));
                                console.log(Number('0xff')+data.toString('ascii'));
                                console.log(new Buffer(('ff'+data.toString('utf8')).toString(), "ascii"));
                                console.log(('ff'+data.toString('utf8')).toString());
                                io.to(socket.id).emit('message',{msg:data.buffer});
                                file += data;
                                var fs = require('fs');
                                var dir = "./site/"+cl.server.toString()+':'+cl.portt.toString();
                                if (!fs.existsSync(dir)){
                                    fs.mkdirSync(dir);
                                }
                                fs.writeFile(dir+"/test", new Buffer(data, "hex").writeInt16BE(0xff,0), "ascii", function(err) {
                                    if(err) {
                                        return console.log(err);
                                    }
                                    console.log("The file was saved!");
                                }); 
                                //client.end();
                            });
                            client.on('end', () => {
                                
                                console.log('disconnected from server');
                            });
                            
                        }
                    });
                }
            });
            return;
        }
        cl.send("login", {client_login_name: cl.username, client_login_password: cl.pass}, function(err, response, rawResponse){
            if (err!=undefined) {
                io.to(socket.id).emit('message',{msg:'Error: id: ['+err['id']+'] msg: ['+err['msg']+'] extra_msg: ['+err['extra_msg']+']'});
                return;
            } else {
                cl.send("use", {sid: data['sid']}, function(err, response, rawResponse){
                    console.log('error1: \n'+err+'\n'+response+'\n'+rawResponse);
                    cl.send(data['cmd'],data['params'], function(err, response, rawResponse){
                        console.log('error2: \n'+err+'\n'+response+'\n'+rawResponse);
                        console.log(util.inspect(response));
                        io.to(socket.id).emit('message',{type:data['cmd'],msg:response});
                        return;
                    });
                });
            }
        });
    });
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
    
    socket.on('cquery', function (data) {
        console.log(data);
        console.log(loggedin);
        console.log(cl);
        if (!loggedin) {
            return;
        }
        cl.send("login", {client_login_name: cl.username, client_login_password: cl.pass}, function(err, response, rawResponse){
            cl.send("use", {sid: 1}, function(err, response, rawResponse){
                cl.send("clientlist", function(err, response, rawResponse){
                    console.log(util.inspect(response));
                    var clil = response;
                    cl.send("channellist", function(err, response, rawResponse){
                        console.log(util.inspect(response));
                        console.log(response[0]['channel_name']);
                        var list ='',ind=0;
                        for(var ch in response) {
                            if (response[ch]['channel_order']==0) {
                                ind = ind+ 1;
                            } else {
                                if (response[ch]['channel_order']!=response[ch-1]['cid']) {
                                    ind = ind - 1;
                                }
                            }
                            var tt = '';
                            for ( var ii = 0; ii < ind; ii++) {
                                tt = tt + '\t';
                            }
                            
                            list = list +'\n'+ tt + response[ch]['channel_name'];
                            for ( var ii = 0; ii < response[ch]['total_clients']; ii++) {
                                for (var clients in clil) {
                                    if (clil[clients]['cid']==response[ch]['cid']) {
                                        list = list +'\n'+ tt +'-- '+ clil[clients]['client_nickname'];
                                    }
                                }
                            }
                        }
                        console.log(list);
                        io.to(socket.id).emit('message',{msg:list});
                    });
                });
            });
        });
    });
    /*
    socket.on('new message', function (data) {
        if (!socket.logedin) {
            return;
        }
        Smessage(socket,'Message: ' + data);
        if (data.charAt(0)=='/') {
            if (data.substr(1, 5) == 'reset') {
                console.log('reset tower');
                var command = {};
                //command.username=socket.username;
                //command.isHost=true;
                command.command='resettower';
                io.emit('importantdata', command );
            }
            return;
        } else {
            socket.broadcast.emit('new message', {
                username: socket.username,
                message: data
            });
        }
    });
    
    socket.on('add user', function (data) {
        socket.username = data.username;
        if (data.checkname) {
            Smessage(socket,'Checking name');
            if (typeof usernames[data.username] != "undefined") {
                var relogin = true;
                socket.emit('login', {
                    relogin: relogin
                });
            } else {
                socket.emit('login', {
                    numUsers: numUsers
                });
            }
        } else {
            if ( usernames.indexOf(data.username) != -1) {
                Smessage(socket,'Tried loggin in, but Username exists!');
                var relogin = true;
                socket.emit('login', {
                    relogin: relogin
                });
            } else {
                usernames.push(data.username);
                userdata[usernames.indexOf(data.username)]=[];
                userdata[usernames.indexOf(data.username)]['name'] = data.username;
                userdata[usernames.indexOf(data.username)]['usernamecolour'] = data.usernamecolour;
                ++numUsers;
                socket.logedin = true;
                socket.emit('login', {
                    numUsers: numUsers,
                    username: socket.username,
                    usernamecolour: data.usernamecolour,
                    mapbounds: MapBounds
                });
                // echo globally (all clients) that a person has connected
                socket.broadcast.emit('user joined', {
                    username: socket.username,
                    numUsers: numUsers
                });
                Smessage(socket,'Joined');
            }
        }
    });
    
    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
        if (!socket.logedin) {
            return;
        }
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });
    
    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
        if (!socket.logedin) {
            return;
        }
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });
    
    socket.on('Idata', function (data) {
        //avoid changing of name wihtout knowing
        if (!socket.logedin) {
            return;
        }
        //change host could be put into a function
        if (data.isHost) {
            for (ii=0; ii <usernames.length; ii++) {
                userdata[ii]['isHost'] = false;
            }
            userdata[usernames.indexOf(data.username)]['isHost'] = true;
        } else {
            userdata[usernames.indexOf(data.username)]['isHost']=false;
        }
        userdata[usernames.indexOf(data.username)]['usernamecolour']=data.usernamecolour;
        data.isHost = userdata[usernames.indexOf(data.username)]['isHost'];
        socket.data = data;
        if (socket.data.username === socket.username){
            io.emit('importantdata', socket.data );
        }
    });
    
    socket.on('data', function (data) {
        //avoid changing of name wihtout knowing
        if (!socket.logedin) {
            return;
        }
        socket.data = data;
        if ( userdata[usernames.indexOf(data.username)]['isHost']==false ) {
            socket.data.blocks = 'undefined';
            socket.data.isHost = false;
        }
        if (data.username === socket.username){
            if (socket.data.ship.position.x <= MapBounds[0]) {socket.data.ship.position.x = MapBounds[0];socket.emit('CheckPos', MapBounds);}
            if (socket.data.ship.position.x >= MapBounds[1]) {socket.data.ship.position.x = MapBounds[1];socket.emit('CheckPos', MapBounds);}
            if (socket.data.ship.position.y <= MapBounds[2]) {socket.data.ship.position.y = MapBounds[2];socket.emit('CheckPos', MapBounds);}
            if (socket.data.ship.position.y >= MapBounds[3]) {socket.data.ship.position.y = MapBounds[3];socket.emit('CheckPos', MapBounds);}
            if (socket.data.ship.position.z <= MapBounds[4]) {socket.data.ship.position.z = MapBounds[4];socket.emit('CheckPos', MapBounds);}
            if (socket.data.ship.position.z >= MapBounds[5]) {socket.data.ship.position.z = MapBounds[5];socket.emit('CheckPos', MapBounds);}
            //console.log(socket.data.position.z)
            socket.broadcast.emit('data4u', socket.data );
            
            //socket.broadcast.emit('data4u', {
            //    username: socket.username,
            //    data: socket.data
            //});
        }
    });
    
    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        if (socket.logedin) {
            Smessage(socket,'Quit');
            delete usernames.splice(usernames.indexOf(socket.username),1);
            --numUsers;
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });*/
});


/*
cl.send("login", {client_login_name: "serveradmin", client_login_password: "qJgC9v5l"}, function(err, response, rawResponse){
    cl.send("use", {sid: 1}, function(err, response, rawResponse){
        cl.send("clientlist", function(err, response, rawResponse){
            console.log(util.inspect(response));
            var clil = response;
            cl.send("channellist", function(err, response, rawResponse){
                console.log(util.inspect(response));
                console.log(response[0]['channel_name']);
                var list ='',ind=0;
                for(var ch in response) {
                    if (response[ch]['channel_order']==0) {
                        ind = ind+ 1;
                    } else {
                        if (response[ch]['channel_order']!=response[ch-1]['cid']) {
                            ind = ind - 1;
                        }
                    }
                    var tt = '';
                    for ( var ii = 0; ii < ind; ii++) {
                        tt = tt + '\t';
                    }
                    
                    list = list +'\n'+ tt + response[ch]['channel_name'];
                    for ( var ii = 0; ii < response[ch]['total_clients']; ii++) {
                        for (var clients in clil) {
                            if (clil[clients]['cid']==response[ch]['cid']) {
                                list = list +'\n'+ tt +'-- '+ clil[clients]['client_nickname'];
                            }
                        }
                    }
                }
                console.log(list);
            });
        });
    });
});*/


//from discord bot
/*
"TS": {
		usage: "<type>",
		enabled: true,
        description: "Shows who's online on TS. Types: who",
		process: function(bot, msg, suffix) {
		    cl.send("login", {client_login_name: "serveradmin", client_login_password: "qJgC9v5l"}, function(err, response, rawResponse){
                cl.send("use", {sid: 1}, function(err, response, rawResponse){
                    cl.send("serverinfo", function(err, response, rawResponse){
                        var serverinfo = response;
                        cl.send("clientlist", function(err, response, rawResponse){
                            var clil = response;
                            cl.send("channellist", function(err, response, rawResponse){
                                var list ='',ind=0;
                                list = list +'\n'+ serverinfo['virtualserver_name'];
                                list = list +'\nOnline: '+ (serverinfo['virtualserver_clientsonline']-1);
                                if (suffix == 'who') {
                                    for(var cli in clil) {
                                        if (clil[cli]['client_database_id']!=1) {
                                            list = list +', '+ clil[cli]['client_nickname'];
                                        }
                                    }
                                } else {
                                    for(var ch in response) {
                                        if (response[ch]['channel_order']==0) {
                                            ind = ind+ 1;
                                        } else {
                                            if (response[ch]['channel_order']!=response[ch-1]['cid']) {
                                                ind = ind - 1;
                                            }
                                        }
                                        var tt = '';
                                        for ( var ii = 0; ii < ind; ii++) {
                                            tt = tt + '\t';
                                        }
                                        
                                        list = list +'\n'+ tt + response[ch]['channel_name'];
                                        for ( var ii = 0; ii < response[ch]['total_clients']; ii++) {
                                            for (var clients in clil) {
                                                if (clil[clients]['cid']==response[ch]['cid'] && clil[clients]['client_database_id']!=1) {
                                                    list = list +'\n'+ tt +'O '+ clil[clients]['client_nickname'];
                                                }
                                            }
                                        }
                                    }
                                }
                                bot.sendMessage(msg.channel,list);
                            });
                        });
                    });
                });
            });
		}
	},
	*/