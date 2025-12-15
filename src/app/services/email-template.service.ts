import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EmailTemplateService {

  getWelcomeEmail(prenom: string, nom: string, loginUrl: string): string {
    const currentYear = new Date().getFullYear();
    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Assurkin Corporate</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Bienvenue ${prenom} ${nom} !</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">
              Nous sommes ravis de vous confirmer la création de votre compte Corporate.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              Vous pouvez désormais vous connecter à votre espace sécurisé en utilisant votre adresse email et le mot de passe que vous avez défini.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Accéder à mon espace
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :<br>
              <a href="${loginUrl}" style="color: #4f46e5;">${loginUrl}</a>
            </p>
          </div>
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
            &copy; ${currentYear} Assurkin. Tous droits réservés.
          </div>
        </div>
      </div>
    `;
  }

  getConfirmationEmail(confirmationUrl: string): string {
    const currentYear = new Date().getFullYear();
    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Assurkin</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Bienvenue parmi nous !</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">
              Merci pour votre inscription 😊
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              Cliquez sur le lien ci-dessous pour confirmer votre adresse e-mail et activer votre compte :
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${confirmationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Confirmer mon adresse e-mail
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              L'équipe de AssurKin
            </p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; font-style: italic;">
                Avertissement :<br>
                Ce message et ses éventuelles pièces jointes sont destinés uniquement au(x) destinataire(s) indiqué(s). S’il vous a été transmis par erreur, veuillez le supprimer immédiatement et en informer l’expéditeur. Toute diffusion ou copie non autorisée est interdite.
              </p>
            </div>
          </div>
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
            &copy; ${currentYear} Assurkin. Tous droits réservés.
          </div>
        </div>
      </div>
    `;
  }

  getPasswordResetEmail(resetUrl: string): string {
    const currentYear = new Date().getFullYear();
    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Assurkin</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Réinitialisation de mot de passe</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">
              Bonjour,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 16px;">
              Vous avez demandé à réinitialiser votre mot de passe pour votre compte Assurkin.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              Veuillez cliquer sur le lien ci-dessous pour définir un nouveau mot de passe :
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
            </p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px;">
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                <a href="${resetUrl}" style="color: #4f46e5; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
          </div>
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
            &copy; ${currentYear} Assurkin. Tous droits réservés.
          </div>
        </div>
      </div>
    `;
  }
}