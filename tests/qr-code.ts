import { BN } from "@coral-xyz/anchor";
import path from 'path';  
import fs from 'fs-extra';

export function QRCode(){
const QRCode = require('qrcode'); // Ensure qrcode library is installed
//QR Code Data
let eventId = 1;
let testEventId = new BN(eventId);
let dateTime = new Date();
const status = 0; // Corresponds to Status.Unusued

// Define the enum status
enum Status {
  Used,
  Unusued,
}

// Combine data into a single string
let dataString = `Event ID: ${eventId}, Date: ${dateTime.toDateString()}, Status: ${Status.Unusued}`;

// Function to save the QR code image
function saveQRCodeImage(dataString: string, filename: string) {
  try {
    // Generate QR code data URL
    const url =  QRCode.toDataURL(dataString);
    
    // Extract base64 data from the URL
    const base64Data = url.split(',')[1];
    if (base64Data) {
      // Define the path to the assets folder
      const assetsPath = path.join( 'assets');
      
      // Ensure the assets folder exists
       fs.ensureDir(assetsPath);

      // Define the full path to save the QR code image
      const filePath = path.join(assetsPath, filename);

      // Write base64 data to a file
       fs.outputFile(filePath, base64Data, 'base64');
      console.log(`QR code saved to ${filePath}`);
    } else {
      console.error('No base64 data found in QR code URL.');
    }
  } catch (error) {
    console.error('Error generating or saving QR code:', error);
  }
}
}