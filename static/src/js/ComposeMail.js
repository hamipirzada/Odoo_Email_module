/* @odoo-module*/
import {Component,useState,useRef} from '@odoo/owl'
import { useBus, useService } from "@web/core/utils/hooks";
import {ImportDialog} from "./AttachmentMail";
/**
 * ComposeMail component for handling mail composition.
 * @extends Component
 */
export class ComposeMail extends Component {
    setup() {
        this.orm = useService('orm')
        this.root = useRef('root');
        this.action = useService('action')
        this.dialog = useService('dialog')
        this.state = useState({
            subject: "",
            recipient: "",
            content: "",
            images: [],
            originalHeight: null,
            minimized: false,
            attachedFiles: [],
            maximized: false,
        })
        this.contentState = useState({
            images: [],
        })

    }
    async imageReader(file) {
        const fileReader = new FileReader();
        fileReader.onload = (event) => {
            const imageDataUrl = event.target.result; // Data URL of the image
            if (imageDataUrl) {
                this.state.images.push({name: file.name, image_uri: imageDataUrl.split(",")[1]})
            }
        };
        fileReader.readAsDataURL(file);

    }
    contentHandler(file) {
    switch (file.type) {
        case "image/jpeg":
        case "image/png":
        case "image/gif":
        case "image/svg+xml":
        case "image/webp":
            return this.imageReader(file);
        case "application/pdf":
            return this.imageReader(file);
        case "text/csv":
            return this.csvReader(file);
        default:
            console.warn(`Unsupported file type: ${file.type}`);
    }
}
    /**
     * Method to send the composed mail.
     */
    async sentMail() {
        const {
            subject,
            recipient,
            content,
            images,
        } = this.state
        let sendMail = []
        if (recipient && subject) {
            try {
                sendMail = await this.orm.call('mail.mail', 'sent_mail', [], {
                    subject,
                    recipient,
                    content,
                    images,
                })
                
                
                if (sendMail && sendMail.length > 0) {
                    this.props.loadMail(sendMail[0])
                }
                
                this.props.close()
                
            } catch (error) {
                console.error('Failed to send mail:', error)
                alert('Failed to send email. Please check your email configuration and try again.')
                this.props.close()
            }
        } else {
            if (!recipient || recipient.trim() === '') {
                alert('Please enter a recipient email address.')
                return
            }
            if (!recipient.includes('@') || !recipient.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                alert('Please enter a valid email address.')
                return
            }
            if (!subject || subject.trim() === '') {
                alert('Please enter a subject for your email.')
                return
            }
        }
    }
    /**
     * Method to maximize or restore the mail composition window.
     */
    maximizeMail() {
        const mailBody = this.root.el;
        const TextArea = this.root.el.querySelector("#content");
        const dialog = mailBody.closest('.modal-dialog');

        if (mailBody.classList.contains('maximized')) {
            // Restore to normal size
            mailBody.style.height = '532px';
            mailBody.style.width = '100%';
            if (dialog) {
                dialog.style.maxWidth = '600px';
                dialog.style.width = '90%';
            }
            if (TextArea) TextArea.style.height = '200px';
        } else {
            // Maximize
            mailBody.style.height = '80vh';
            mailBody.style.width = '100%';
            if (dialog) {
                dialog.style.maxWidth = '95vw';
                dialog.style.width = '95vw';
            }
            if (TextArea) TextArea.style.height = '400px';
        }
        mailBody.classList.toggle('maximized');
        this.state.maximized = !this.state.maximized;
    }
    /**
     * Method to close the mail composition window.
     */
    Close() {
        this.props.close()
    }
    /**
     * Method to minimize or restore the mail composition window.
     */
    minimizeMail() {
        const mailBody = this.root.el;
        if (!this.state.minimized) {
            this.state.originalHeight = mailBody.style.height;
            mailBody.style.height = '50px';
        } else {
            mailBody.style.height = this.state.originalHeight;
        }
        this.state.minimized = !this.state.minimized;
    }
    /**
     * Method to trigger the attachment action.
     */
   async attachmentAction() {
        this.dialog.add(ImportDialog, {
            addAttachment: this.addAttachment.bind(this)
        })
    }
    closeInput(index){
        this.state.attachedFiles.splice(index, 1)
    }
    addAttachment(attachment) {
        this.state.attachedFiles.push(attachment)
        this.contentHandler(attachment)
    }
}
ComposeMail.template = 'ComposeMail'
