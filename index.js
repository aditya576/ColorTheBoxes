const { response } = require("express");
const http= require("http")
const app=require("express")();

app.get("/",(req,res)=>{   // Express will serve the html page 
    res.sendFile(__dirname+"/index.html")
})

app.listen(8081,()=>{
    console.log("listening on http port 8081")
})

const webSocketServer=require("websocket").server
const httpServer=http.createServer()
httpServer.listen(8080,()=> console.log("Listening on 8080"));

//hashmap
const clients={};
const games={};

const wsServer=new webSocketServer({
    "httpServer":httpServer 
})

wsServer.on("request",request=>{
    //making connection
    const connection=request.accept(null,request.origin);
    connection.on("open",()=>{
        console.log("opened")
    })
    connection.on("close",()=>{
        console.log("Closed!")
    })
    connection.on("message",message=>{
        const result= JSON.parse(message.utf8Data)
        if(result.method==="create"){
            const clientId=result.clientId
            const gameId=guid();
            games[gameId]={
                "id":gameId,//the information of a client in the game
                "balls":20,
                "clients":[]
            }
            const payLoad={
                "method":"create",
                "game":games[gameId]                
            }
            const con=clients[clientId].connection
            con.send(JSON.stringify(payLoad));
        }

        // a client wants to join 
        if(result.method==="join"){
            const clientId=result.clientId;
            const gameId=result.gameId
            const game=games[gameId]
            if(game.clients.length>=3){
                return ;
            }

            const color= {"0":"Red","1":"Green","2":"Blue"}[game.clients.length]

            game.clients.push({
                "clientId":clientId,
                "color":color
            })
            //start the game
            if(game.clients.length===3)
                updateGameState();

            const payLoad={
                "method":"join",
                "game":game
            }
            //loop through the clients and telling some people haave joined
            game.clients.forEach(c=>{
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })

        }

        if(result.method==="play"){
            const clientId=result.clientId
            const gameId=result.gameId
            const ballId=result.ballId
            const color=result.color
            let state=games[gameId].state;
            if(!state)
                state={}
            
            state[ballId]= color
            games[gameId].state=state

        }

    })

    // generate a new clientId
    const clientId=guid();
    clients[clientId]={
        "connection" : connection
    }

    const payLoad={
        "method" : "connect",
        "clientId": clientId
    }

    connection.send(JSON.stringify(payLoad))

})

function updateGameState(){

    for(const g of Object.keys(games)){
        const game=games[g]
        const payLoad={
            "method":"update",
            "game":game
        }
        games[g].clients.forEach(c=>{
            clients[c.clientId].connection.send(JSON.stringify(payLoad))
        })
    }
    setTimeout(updateGameState,500);
}


const guid=()=> {
    const s4=()=> Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);     
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
}