import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
    //100 or .1 second delay before navigating to emergency types
    setTimeout(() => {
      this.router.navigate(['/emergency-types'], { replaceUrl: true });
    }, 100);
  }
}