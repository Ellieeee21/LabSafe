import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular';
import { IonContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  imports: [IonContent]
})
export class SplashPage implements OnInit {

  constructor(
    private router: Router,
    private platform: Platform
  ) { }

  async ngOnInit() {
    await this.platform.ready();
    
    // Hide the native splash screen immediately since we're showing our custom one
    if (this.platform.is('capacitor')) {
      await SplashScreen.hide();
    }

    // Show our custom splash for 2 seconds
    setTimeout(() => {
      this.router.navigate(['/emergency-types'], { replaceUrl: true });
    }, 1000);
  }
}