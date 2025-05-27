import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular';
import { IonContent } from "@ionic/angular/standalone";

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true, // Add this for standalone components
  imports: [IonContent] // Add Ionic components used in template
})
export class SplashPage implements OnInit {

  constructor(
    private router: Router,
    private platform: Platform
  ) { }

  ngOnInit() {
    this.platform.ready().then(() => {
      SplashScreen.hide();
    });

    // Show splash for 1.5 seconds then go to home
    setTimeout(() => {
      this.router.navigate(['/home'], { replaceUrl: true });
    }, 1500);
  }
}