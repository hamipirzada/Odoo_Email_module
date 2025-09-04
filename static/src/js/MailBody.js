/* @odoo-module*/
import { Component, useRef, useState ,markup} from '@odoo/owl'
import { useService } from "@web/core/utils/hooks";

/**
 * MailBody component for displaying mail details.
 * @extends Component
 */
export class MailBody extends  Component {
    setup() {
        this.root = useRef('root')
        this.html_content = this.props.mail.body_html ? this.props.mail.body_html.replace(/<br>/g, '') : ''
        this.orm = useService('orm')
        this.state = useState({
            starred: this.props.mail.is_starred || false,
        })
        this.env.bus.addEventListener("SELECT:ALL", (event) => {
            const { checked } = event.detail
            if (this.root.el && this.root.el.querySelector(".mail_check_box")) {
                this.root.el.querySelector(".mail_check_box").checked = checked
                this.props.onSelectMail(this.props.mail.id, checked)
            }
        })
    }
    /**
     * Method triggered on click of the mail selection checkbox.
     * @param {Object} ev - Event object.
     */
    onClickSelect(ev) {
        const checked = ev.target.checked
        this.props.onSelectMail(this.props.mail.id, checked)
    }
     /**
     * Method to archive the mail.
     * @param {Object} event - Event object.
     */
     async archiveMail(event){
      event.stopPropagation()
      var mail = this.props.mail.id
      await this.orm.call('mail.mail','archive_mail',[mail])
      // Notify parent to refresh the view instead of full page reload
      if (this.props.onRefresh) {
          this.props.onRefresh()
      }
    }
    /**
     * Method to unarchive the mail.
     * @param {Object} event - Event object.
     */
     async unArchive(event){
      event.stopPropagation()
      var mail = this.props.mail.id
       await this.orm.call('mail.mail','unarchive_mail',[mail])
       if (this.props.onRefresh) {
           this.props.onRefresh()
       }
      }
      /**
     * Method to resend the mail.
     * @param {Object} event - Event object.
     */
    async resendMail(){
      var mail = this.props.mail.id
      await this.orm.call('mail.mail','retry_mail',[mail])
    }
    /**
     * Method to restore the mail from trash.
     * @param {Object} event - Event object.
     */
    async restoreMail(event){
      event.stopPropagation()
      var mail = this.props.mail.id
      await this.orm.call('mail.mail','restore_mail',[mail])
      if (this.props.onRefresh) {
          this.props.onRefresh()
      }
    }
    
    /**
     * Method to format datetime for display
     * @param {String} dateStr - ISO datetime string
     * @returns {String} - Formatted datetime
     */
    formatDateTime(dateStr) {
        if (!dateStr) return 'Unknown Date'
        
        const date = new Date(dateStr)
        const now = new Date()
        const diffTime = Math.abs(now - date)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        // If today, show time
        if (diffDays <= 1 && date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            })
        }
        
        // If this year, show month/day
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            })
        }
        
        // Otherwise show full date
        return date.toLocaleDateString('en-US', { 
            year: 'numeric',
            month: 'short', 
            day: 'numeric' 
        })
    }
    /**
     * Method to delete the mail.
     * @param {Object} event - Event object.
     */
    async deleteMail(event){
       event.stopPropagation()
       var mail = this.props.mail.id
       if (this.props.mailType === 'trash') {
           // Permanent delete if already in trash
           await this.orm.call('mail.mail','delete_checked_mail',[mail])
       } else {
           // Move to trash
           await this.orm.call('mail.mail','move_to_trash',[mail])
       }
       if (this.props.onRefresh) {
           this.props.onRefresh()
       }
    }
    /**
     * Method to star or unstar the mail.
     * @param {Object} event - Event object.
     */
    async starMail(event){
        const newStarredState = !this.state.starred
        this.state.starred = newStarredState
        var mail = this.props.mail.id
        this.props.starMail(mail, newStarredState)
        
        if (newStarredState) {
            await this.orm.call('mail.mail','star_mail',[mail])
        } else {
            await this.orm.call('mail.mail','unstar_mail',[mail])
        }
        
        // Update the mail object's is_starred property for consistency
        this.props.mail.is_starred = newStarredState
    }
    /**
     * Method to open the mail.
     * @param {Object} event - Event object.
     */
   async openMail(event){
     var mail = this.props.mail
     this.props.openMail(mail)
   }
}
MailBody.template = 'MailBody'
