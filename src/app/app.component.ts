import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private platform: Platform) {}

  ngOnInit() {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();
    
    // Configure status bar
    if (this.platform.is('capacitor')) {
      await StatusBar.setStyle({ style: Style.Default });
      
      // Hide splash screen after a delay
      setTimeout(async () => {
        await SplashScreen.hide({
          fadeOutDuration: 300
        });
      }, 1200); // Show splash for 1.2 seconds
    }
  }
}