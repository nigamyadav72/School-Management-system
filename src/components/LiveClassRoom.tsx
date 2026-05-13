import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { X, Link } from 'lucide-react';

interface LiveClassRoomProps {
  roomName: string;
  userName: string;
  userEmail: string;
  isTeacher: boolean;
  onClose: () => void;
}

export default function LiveClassRoom({ roomName, userName, userEmail, isTeacher, onClose }: LiveClassRoomProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="bg-[#0f172a] text-white p-4 flex justify-between items-center border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg">Live Class: {roomName.replace('EduPulse-Class-', '')}</div>
          <button 
            onClick={() => {
              const url = window.location.origin;
              navigator.clipboard.writeText(`Join my EduPulse Live Class!\nRoom: ${roomName}\nLink: ${url}`);
              alert("Invite link and details copied to clipboard!");
            }}
            className="text-[12px] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-all flex items-center gap-2 border border-white/10"
          >
            <Link className="w-3.5 h-3.5" /> Copy Invite Link
          </button>
        </div>
        <button 
          onClick={onClose}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all"
        >
          <X className="w-5 h-5" /> {isTeacher ? 'End Session' : 'Leave Class'}
        </button>
      </div>
      <div className="flex-1 w-full bg-slate-900 relative">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={roomName}
          configOverwrite={{
            startWithAudioMuted: true,
            disableModeratorIndicator: true,
            startScreenSharing: false,
            enableEmailInStats: false
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false
          }}
          userInfo={{
            displayName: userName,
            email: userEmail
          }}
          onApiReady={(externalApi) => {
            // Handle any external API events if needed
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
          }}
        />
      </div>
    </div>
  );
}
