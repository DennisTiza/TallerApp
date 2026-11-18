import {
  exportDatabaseAsJSON,
  importDatabaseFromJSON,
  DatabaseBackupPayload,
} from '../database/backup';

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  mimeType: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

function getGoogleSigninModule() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-google-signin/google-signin');
    return mod;
  } catch {
    return null;
  }
}

export const googleDriveService = {
  /**
   * Configura Google Sign-In para la aplicación.
   * Debes suministrar tu webClientId obtenido de la consola de Google Cloud.
   */
  configure(webClientId?: string) {
    const mod = getGoogleSigninModule();
    if (!mod) {
      console.warn('[GoogleDrive] Google Sign-In requiere un Development Build (npx expo run:android / eas build) para compilar sus módulos nativos.');
      return;
    }
    mod.GoogleSignin.configure({
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata',
      ],
      webClientId: webClientId || undefined,
      offlineAccess: true,
    });
  },

  /**
   * Inicia sesión con la cuenta de Google del usuario.
   */
  async signIn() {
    const mod = getGoogleSigninModule();
    if (!mod) {
      throw new Error(
        'Google Sign-In no está disponible en Expo Go estándar. Requiere un Development Build (npx expo run:android).'
      );
    }
    try {
      await mod.GoogleSignin.hasPlayServices();
      const response = await mod.GoogleSignin.signIn();
      return response;
    } catch (error: any) {
      const statusCodes = mod.statusCodes;
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Inicio de sesión cancelado por el usuario.');
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Operación de inicio de sesión ya en curso.');
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services no disponible o desactualizado.');
      } else {
        throw new Error(error.message || 'Error al iniciar sesión con Google.');
      }
    }
  },

  /**
   * Cierra sesión de Google en el dispositivo.
   */
  async signOut() {
    const mod = getGoogleSigninModule();
    if (mod) {
      await mod.GoogleSignin.signOut();
    }
  },

  /**
   * Obtiene el token de acceso OAuth2 para interactuar con la API de Google Drive.
   */
  async getAccessToken(): Promise<string> {
    const mod = getGoogleSigninModule();
    if (!mod) {
      throw new Error('Google Sign-In no está disponible en este entorno.');
    }
    const tokens = await mod.GoogleSignin.getTokens();
    if (!tokens.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Drive.');
    }
    return tokens.accessToken;
  },

  /**
   * Realiza un respaldo completo de la base de datos local y lo sube a Google Drive.
   */
  async createBackup(): Promise<GoogleDriveBackupFile> {
    const accessToken = await this.getAccessToken();
    const backupData = await exportDatabaseAsJSON();
    const backupJsonString = JSON.stringify(backupData, null, 2);

    const timestamp = new Date()
      .toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .split('.')[0];
    const fileName = `taller_backup_${timestamp}.json`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      description: `Respaldo automático de TallerApp - ${new Date().toLocaleString()}`,
    };

    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      backupJsonString +
      closeDelimiter;

    const response = await fetch(DRIVE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error al subir respaldo a Google Drive: ${errText}`);
    }

    const result = await response.json();
    return result as GoogleDriveBackupFile;
  },

  /**
   * Lista todos los respaldos de TallerApp guardados en Google Drive.
   */
  async listBackups(): Promise<GoogleDriveBackupFile[]> {
    const accessToken = await this.getAccessToken();
    const query = encodeURIComponent("name contains 'taller_backup_' and trashed = false");
    const url = `${DRIVE_API_URL}?q=${query}&fields=files(id,name,createdTime,size,mimeType)&orderBy=createdTime desc`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error al consultar respaldos de Google Drive: ${errText}`);
    }

    const data = await response.json();
    return (data.files || []) as GoogleDriveBackupFile[];
  },

  /**
   * Descarga un respaldo específico de Google Drive y lo restaura en la base de datos local.
   */
  async restoreBackup(fileId: string): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    const url = `${DRIVE_API_URL}/${fileId}?alt=media`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error al descargar respaldo de Google Drive: ${errText}`);
    }

    const backupPayload: DatabaseBackupPayload = await response.json();
    await importDatabaseFromJSON(backupPayload);
    return true;
  },
};
