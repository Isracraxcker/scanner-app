import { Component, OnInit } from '@angular/core';
import html2canvas from 'html2canvas';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { AlertController, LoadingController, ModalController, Platform, ToastController } from '@ionic/angular';
import { BarcodeScanningModalComponent } from './barcode-scanning-modal.component';
import { LensFacing, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  segment = 'scan';
  qrText = ''

  scanResult = '';

  constructor(
    private loadingController: LoadingController,
    private platform: Platform,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
   
  ) { }



  ngOnInit(): void {
     
    this.platform.backButton.subscribeWithPriority(0, async () => {
      // Lógica para salir de la aplicación al presionar el botón de "volver"
      if (this.platform.is('android')) {
        await this.confirmExit();
      }
    });
  

    if (this.platform.is('capacitor')) {

      BarcodeScanner.isSupported().then();
      BarcodeScanner.checkPermissions().then();
      BarcodeScanner.removeAllListeners();

    }
  }

// CODIGOOO DE SALIDA- BOTON DE VOLVER
  async confirmExit() {
    const alert = await this.alertController.create({
      //header: 'Confirmar salida',
      message: '¿Estás seguro de que quieres salir?',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            // Usuario cancela la salida
          }
        },
        {
          text: 'Salir',
          handler: () => {
            // Usuario confirma la salida
            App.exitApp();
          }
        }
      ]
    });

    await alert.present();
  }


  // BORRRAR ESCANEO RECIENTE
  async borrarScanResult() {
    this.scanResult = '';
  
    const toast = await this.toastController.create({
      message: 'El escaneo se ha borrado.',
      duration: 2000, // Duración de 2 segundos
      color: 'dark',
      icon: 'trash-outline',
      position: 'bottom' ,// Posición del toast en la parte inferior
      mode: 'ios'
    });
  
    await toast.present();
  }

  async startScan() {
    const modal = await this.modalController.create({
      component: BarcodeScanningModalComponent,
      cssClass: 'barcode-scanning-modal',
      showBackdrop: false,
      componentProps: {
        formats: [],
        lensFacing: LensFacing.Back
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data) {
      this.scanResult = data?.barcode?.displayValue;
    }


  }
  async readBarcodeFromImage() {

    const { files } = await FilePicker.pickImages();
    const path = files[0]?.path;

    if (!path) return;

    const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
      path,
      formats: []
    })

    this.scanResult = barcodes[0].displayValue;
  }


  captureScreen() {

    const element = document.getElementById('qrImage') as HTMLElement;

    html2canvas(element).then((canvas: HTMLCanvasElement) => {
      this.downloadImage(canvas);

      if (this.platform.is('capacitor')) this.shareImage(canvas);
      else this.downloadImage(canvas);
    })
  }
  // DOWNLOAD IMAGE -- WEB
  downloadImage(canvas: HTMLCanvasElement) {
    const link = document.createElement('a');
    link.href = canvas.toDataURL();

    link.download = 'qr.png';
    link.click();

  }

  // Share IMAGE -- MOVIL
  async shareImage(canvas: HTMLCanvasElement) {
    let base64 = canvas.toDataURL();
    let path = 'qr.png';


    const loading = await this.loadingController.create({ spinner: 'crescent' });
    await loading.present();



    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,

    }).then(async (res) => {
      let uri = res.uri

      await Share.share({ url: uri });
      await Filesystem.deleteFile({
        path,
        directory: Directory.Cache
      })

    }).finally(() => {
      loading.dismiss();
    })

  }




  writeToClipboard = async () => {
    await Clipboard.write({
      string: this.scanResult
    });


    const toast = await this.toastController.create({
      message: 'Se copio a portapapeles.',
      duration: 1000,
      color: 'dark',
      icon: 'clipboard-outline',
      position: 'bottom',
      mode: 'ios'
    });
    toast.present();

  };



 openCapacitorSite = async () => {


  const alert = await this.alertController.create({
    header: 'Confirmar!',
    message: '¿Quieres abrir este enlace en el navegador?',
    mode: 'ios',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
    
      }, {
        text: 'Ok',
        handler: async () => {
          let url = this.scanResult;
          if (!url.startsWith('https://')) url = 'https://' + url;
          
          await Browser.open({ url });
        }
      }
    ]
  });

  await alert.present();






};

  isUrl(){
    let regex = /\.(com|net|io|me|crypto|ai)\b/i;
    return regex.test(this.scanResult);
  }




}
