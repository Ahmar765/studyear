
import { Rocket } from "lucide-react";
import Logo from "./logo";

export default function SplashScreen() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      <div id="stars"></div>
      <div id="stars2"></div>
      <div id="stars3"></div>
      
      <div className="z-10 flex flex-col items-center text-center">
          <div className="rocket-container">
              <div className="rocket">
                  <div className="rocket-body">
                      <div className="rocket-fin rocket-fin-left"></div>
                      <div className="rocket-fin rocket-fin-right"></div>
                      <div className="rocket-window"></div>
                  </div>
                  <div className="rocket-exhaust-flame"></div>
                  <ul className="rocket-exhaust-fumes">
                      <li></li>
                      <li></li>
                      <li></li>
                      <li></li>
                      <li></li>
                      <li></li>
                      <li></li>
                      <li></li>
                      <li></li>
                  </ul>
              </div>
          </div>
          <div className="mt-8">
            <Logo />
            <p className="text-muted-foreground mt-2 animate-pulse">Launching your learning experience...</p>
          </div>
      </div>
    </div>
  );
}
