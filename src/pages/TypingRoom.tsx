"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "@/components/ui/button";
import { useCounter } from "@/hooks/useCounter";
import { BadgeCheck } from "lucide-react";
import "../app/globals.css";
import TypingCmp from "../components/TypingCmp";
import TimerDisplay from "../components/TimerDisplay";
import OpponentStats from "../components/OpponentStats";
import { textOptions } from "@/config/phrases";
// import {IP} from "./ip";
import React from "react";

const socket = io(`https://typing-battle.onrender.com`, {
  transports: ["websocket"],
});

// if you using the website locally then comment the above code and uncomment bellow

// const socket = io(`ws://${IP}:4000`, {
//   transports: ["websocket"],
// });

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface RoomData {
  id: string;
  text: string;
  players: Player[];
  status: string;
  ready: string[];
}

export default function TypingRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [RoomData, setRoomData] = useState<RoomData | null>(null);
  const [opponentStats, setOpponentStats] = useState<{
    playerName: string;
    wpm: number;
    accuracy: number;
    errors: number;
  } | null>(null);



  const {
    toggleStart: startPreparationTimer,
    Counter: preparationTime,
    toggleReset:resetTypingTimer,
  } = useCounter(5);



  const searchParams = useSearchParams();

   const handleReady = () => {
    socket.emit("playerReady", { playerId, roomId });
   
  };
  
  const sampleText = textOptions[Math.floor(Math.random() * textOptions.length)];

  useEffect(() => {
    if (
      (RoomData?.players.length ?? 0) >= 2 &&
      (RoomData?.ready.length ?? 0) >= 2 &&
      RoomData?.status === "running"
    ) {
      // Reset preparation timer first
      resetTypingTimer(); // Add this line
      // Then start the timer with a slight delay
      setTimeout(() => {
        startPreparationTimer();
      }, 1000);
    }
  }, [RoomData?.players.length, RoomData?.ready.length, RoomData?.status]);

  useEffect(() => {
    const roomId = localStorage.getItem("roomId");
    const playerId = localStorage.getItem("playerId");
    const playerName = searchParams?.get("playerName");


 


    if (roomId && playerId && playerName) {
      setRoomId(roomId);
      setPlayerId(playerId);
      setPlayerName(playerName);

      console.log("player id: ", playerId);
      console.log("player name: ", playerName);

      
    }

    socket.emit("setPlayerId" , playerId);

    if (!roomId || !playerId || !playerName) {
      console.error("Missing required parameters");
      return;
    }
    console.log("room:", RoomData);
     
      socket.emit("getRoomData", { roomId });
  

    socket.on("roomData", (data) => {
      console.log("Received room data:", data);

      if (!data) {
        console.log("Creating new room:", roomId);
        socket.emit("createRoom", { roomName: roomId, playerName, playerId, text: sampleText });
      } else if (!data.players.find((p: Player) => p.id === playerId)) {
        console.log("Joining existing room:", roomId);
        socket.emit("joinRoom", { roomName: roomId, playerName, playerId });
      }

      setRoomData(data);
    });

    socket.on("roomCreated", (data) => {
      console.log("Room created:", data);
      setRoomData({
        id: data.roomId,
        text: data.text,
        players: [
          {
            id: data.playerId,
            name: data.playerName,
            isHost: true,
          },
        ],
        ready: [],
        status: "waiting",
      });
      localStorage.setItem("roomId", data.roomId);
    });

    socket.on("playerJoined", ({ roomId: updatedRoomId, players }) => {
      console.log("Player joined:", players);
      if (updatedRoomId === roomId) {
        setRoomData((prev) => ({
          ...prev!,
          players: players,
        }));
      }
      localStorage.setItem("roomId", updatedRoomId);
    });

    socket.on("gameReset", () => {
      // Reset all necessary states
      resetTypingTimer();
      setRoomData(prev => ({
        ...prev!,
        ready: [],
        status: "waiting"
      }));
    });

    
    

    socket.on("playerStats", ({ playerId: statsPlayerId, playerName: statsPlayerName, stats }) => {
      if (statsPlayerId !== playerId) {
        setOpponentStats({
          playerName: statsPlayerName,
          ...stats,
        });
      }
    });

    return () => {
      socket.off("playerJoined");
      socket.off("roomData");
      socket.off("roomCreated");
      socket.off("playerStats");
      socket.off("playerReady");
      socket.off("gameReset");

    };

  },  [searchParams, playerId, playerName,
    RoomData?.players.length, 
    RoomData?.ready.length,   
    RoomData?.status ,  
    RoomData?.text]);

    useEffect(()=>{
      if(RoomData?.status === "running"){
        startPreparationTimer();
      }
    },[RoomData?.status,socket ]);

  if (!RoomData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/bg.jpg')] bg-cover bg-center">
        <div className="text-white text-2xl">🎮 Loading room data... ⌛</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('/bg.jpg')] bg-cover bg-center  ">
      <Card className={`w-full h-screen bg-black px-7 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-20 border-none`}>
        {opponentStats && <OpponentStats {...opponentStats} />}
        
        <CardHeader className="space-y-8">
        <CardTitle className="text-white text-4xl text-center font-bold tracking-wide bg-clip-text">
           Room: &rdquo;{roomId}&rdquo;
          </CardTitle>
        </CardHeader>

        <CardContent className="">
          <div className="text-white">
            <TimerDisplay counter={preparationTime} status={RoomData?.status} />
            
            <div className="text-center space-y-8 mb-12">
            <h2 className="text-2xl font-bold text-white bg-clip-text">
               {RoomData.status === 'waiting' && '⏳'}
                {RoomData.status === 'running' && '🏃'}
                {RoomData.status.toUpperCase()}
              </h2>

            </div>

            <div className="flex items-center justify-center gap-8 mb-6">
              {RoomData.players.map((player, index) => (
                <React.Fragment key={player.id}>
                  <div className={`p-3 rounded-xl w-72 backdrop-blur-lg transform transition-all duration-300 
                    ${player.id === playerId 
                      ? "bg-white/10 border-2 border-green-400/20" 
                      : "bg-white/10 border-2 border-white/20"}`}>
                    <div className="font-bold flex justify-between items-center text-2xl">
                    <span className="truncate">
                        {player.id === playerId ? '🎮 ' : '🕹️ '}
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span className="text-amber-300 text-sm font-normal">👑Host</span>
                      )}
                      <span>
                        {RoomData.ready.includes(player.id) ? (
                          <BadgeCheck className="w-8 h-8 text-green-400 animate-pulse" />
                        ) : (
                          player.id === playerId && (
                            <Button 
                              className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black font-bold transform transition-all duration-300 hover:scale-105 shadow-lg"
                              onClick={handleReady}
                            >
                              Ready
                            </Button>
                          )
                        )}
                      </span>
                    </div>
                  </div>
                  {index === 0 && RoomData.players.length > 1 && (
                    <div className="text-4xl font-bold bg-gradient-to-r from-white to-white text-transparent bg-clip-text animate-pulse">
                      VS
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {RoomData.ready.length >= 2 ? (
            <div className="transform transition-all duration-500 ">
              <TypingCmp
                socket={socket}
                roomId={roomId!}
                playerId={playerId!}
                counter={preparationTime}
                sampleText={RoomData.text}
                
              />
            </div>
          ) : (
            <div className="flex mt-16 items-center justify-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-300 to-red-400 text-transparent bg-clip-text animate-pulse">
                Waiting for players to ready... {RoomData.ready.length}/2
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

