import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { X } from 'lucide-react';

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
        <div className="font-bold text-lg">Live Class: {roomName.replace('EduPulse-Class-', '')}</div>
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
