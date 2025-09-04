/* @odoo-module*/
import { registry } from '@web/core/registry';
import { Component , useRef , useState, onWillStart ,onMounted} from '@odoo/owl'
import { useService } from "@web/core/utils/hooks";
import { MailBody } from './MailBody'
import { SentMail } from './SentMail'
import { MessageView } from './MessageView'
import { ComposeMail } from './ComposeMail'
import { ImportDialog } from './AttachmentMail'
import { session } from "@web/session";
/**
 * odooMail component for handling mail-related functionalities.
 * @extends Component
 */
class odooMail extends  Component {
    setup() {
        this.mailState = useState({
            loadLogo: "",
            loadMail: [],
            getCount: "",
            outBox: "",
            mode: "tree",
            formData: {},
            mailType: "all",
            currentPage: 1,
            totalPages: 1,
            totalEmails: 0
        })
        this.dialogService = useService("dialog")
        this.root = useRef('root');
        this.action = useService('action')
        this.orm = useService('orm')
        this.selectedMails = []
        onMounted(() => {
            this.allMailView()
        })
        onWillStart(async ()=> {
            this.mailState.loadLogo = await this.orm.call('mail.icon','load_logo',[])
//            this.allMailView()
            this.getCount()
        })
    }
     /**
     * Method to get the count of different mail categories.
     */
    async getCount(){
        this.mailState.getCount = await this.orm.call('mail.mail','get_mail_count',[])
    }
    /**
     * Method to compose a new mail.
     */
    async composeMail(){
     this.dialogService.add(ComposeMail, {
        loadMail: async (mail) => {
            await this.getCount()
            
            // Refresh the current view to fetch all emails from database including the new one
            const currentView = this.mailState.mailType
            
            setTimeout(async () => {
                await this.refreshCurrentView()
            }, 500)
        }
     })
    }
    /**
     * Method triggered on click of the "Select All" checkbox.
     * @param {Object} ev - Event object.
     */
    onClickSelectAll(ev) {
        const checked = ev.target.checked
        this.env.bus.trigger("SELECT:ALL", { checked })
    }
    /**
     * Getter method to get props for MailBody component.
     * @returns {Object} - Props for MailBody component.
     */
    get mailProps() {
        return {
            onSelectMail: this.onSelectMail.bind(this),
            starMail: this.starMail.bind(this),
            openMail: this.openMail.bind(this),
            onRefresh: this.refreshCurrentView.bind(this),
            mailType: this.mailType,
        }
    }
    
    /**
     * Method to refresh the current view without full page reload
     */
    async refreshCurrentView() {
        switch (this.mailState.mailType) {
            case 'all':
                await this.allMailView()
                break
            case 'starred':
                await this.starredMail()
                break
            case 'archive':
                await this.archivedMail()
                break
            case 'outbox':
                await this.outboxMailView()
                break
            case 'sent':
                await this.sentMail()
                break
            case 'trash':
                await this.trashMailView()
                break
        }
        await this.getCount()
    }
       /**
     * Method to reset the mail view.
     */
    resetView(){
        this.mailState.formData = {}
        this.mailState.mode = "tree"
    }
    
    /**
     * Method to load emails with pagination
     */
    async loadEmailsWithPagination(domain) {
        const pageSize = 20
        const offset = (this.mailState.currentPage - 1) * pageSize
        
        // Get total count
        this.mailState.totalEmails = await this.orm.searchCount('mail.mail', domain)
        this.mailState.totalPages = Math.ceil(this.mailState.totalEmails / pageSize)
        
        // Get emails for current page
        this.mailState.loadMail = await this.orm.searchRead('mail.mail', domain, [], {
            order: "message_date desc, create_date desc",
            limit: pageSize,
            offset: offset
        })
    }
    
    /**
     * Reset pagination to first page
     */
    resetPagination() {
        this.mailState.currentPage = 1
        this.mailState.totalPages = 1
        this.mailState.totalEmails = 0
    }
    
    /**
     * Go to previous page
     */
    async goToPreviousPage() {
        if (this.mailState.currentPage > 1) {
            this.mailState.currentPage--
            await this.loadCurrentPageEmails()
        }
    }
    
    /**
     * Go to next page  
     */
    async goToNextPage() {
        if (this.mailState.currentPage < this.mailState.totalPages) {
            this.mailState.currentPage++
            await this.loadCurrentPageEmails()
        }
    }
    
    /**
     * Load emails for current page based on folder type
     */
    async loadCurrentPageEmails() {
        const domains = {
            'all': [['active', '=', true], ['is_deleted', '=', false]],
            'starred': [['is_starred', '=', true], ['active', '=', true], ['is_deleted', '=', false]],
            'archive': [['active', '=', false], ['is_deleted', '=', false]],
            'outbox': [['is_deleted', '=', false], '|', ['state', '=', 'exception'], ['state', '=', 'outgoing']],
            'sent': [['state', '=', 'sent'], ['is_deleted', '=', false]],
            'trash': [['is_deleted', '=', true]]
        }
        
        const domain = domains[this.mailState.mailType] || domains['all']
        await this.loadEmailsWithPagination(domain)
    }
    /**
     * Method to open a specific mail.
     * @param {Object} mail - Mail object.
     */
    openMail(mail) {
        this.mailState.formData = mail
        this.mailState.mode = "form"
    }
     /**
     * Method to star or unstar a mail.
     * @param {Number} mail - Mail ID.
     * @param {Boolean} type - Type of action (star or unstar).
     */
    starMail(mail, type){
        if (type) {
            this.mailState.getCount.starred_count ++
        }
        else this.mailState.getCount.starred_count --
    }
     /**
     * Method triggered on selecting or deselecting a mail.
     * @param {Number} mailId - Mail ID.
     * @param {Boolean} check - Checked or not.
     */
    onSelectMail(mailId, check) {
        if (check) {
            if (!this.selectedMails.includes(mailId)) {
                this.selectedMails.push(mailId)
            }
        }
        else {
            this.selectedMails = this.selectedMails.filter(item => item !== mailId)
        }
    }
    /**
     * Getter method to get the mail type.
     * @returns {String} - Current mail type.
     */
    get mailType() {
        return this.mailState.mailType
    }
      /**
     * Method to archive selected mails.
     * @param {Object} event - Event object.
     */
    async archiveMail(event){
          if (this.selectedMails.length){
                this.mailState.loadMail = this.mailState.loadMail.filter(item => !this.selectedMails.includes(item.id))
                 await this.orm.call('mail.mail','archive_mail',[this.selectedMails])
                 this.getCount()
                 this.selectedMails = []
            }
    }
    /**
     * Method to unarchive selected mails.
     * @param {Object} event - Event object.
     */
    async unArchiveMail(event){
          if (this.selectedMails.length){
                this.mailState.loadMail = this.mailState.loadMail.filter(item => !this.selectedMails.includes(item.id))
                 await this.orm.call('mail.mail','unarchive_mail',[this.selectedMails])
                 this.getCount()
                 this.selectedMails = []
            }
    }
    /**
     * Method to restore selected mails from trash.
     * @param {Object} event - Event object.
     */
    async restoreMail(event){
          if (this.selectedMails.length){
                this.mailState.loadMail = this.mailState.loadMail.filter(item => !this.selectedMails.includes(item.id))
                 await this.orm.call('mail.mail','restore_mail',[this.selectedMails])
                 this.getCount()
                 this.selectedMails = []
            }
    }
    /**
     * Method to refresh the page.
     * @param {Object} event - Event object.
     */
    refreshPage(event){
      window.location.reload()
    }
     /**
     * Method to delete selected mails.
     * @param {Object} event - Event object.
     */
    async deleteMail(event){
            if (this.selectedMails.length){
                this.mailState.loadMail = this.mailState.loadMail.filter(item => !this.selectedMails.includes(item.id))
                if (this.mailState.mailType === 'trash') {
                    // Permanent delete if already in trash
                    await this.orm.call('mail.mail','delete_mail',[this.selectedMails])
                } else {
                    // Move to trash
                    await this.orm.call('mail.mail','move_to_trash',[this.selectedMails])
                }
                this.getCount()
                this.selectedMails = []
            }
    }
    /**
     * Method to view all mails.
     */
    async allMailView(){
            this.root.el.querySelector('.all_mail')?.classList.add('active');
            this.root.el.querySelector('.archieved-mail')?.classList.remove('active');
            this.root.el.querySelector('.sent-mail')?.classList.remove('active');
            this.root.el.querySelector('.outbox')?.classList.remove('active');
            this.root.el.querySelector('.sent')?.classList.remove('active');
            this.root.el.querySelector('.trash-mail')?.classList.remove('active');
        this.mailState.mailType = 'all'
        this.resetView()
        this.resetPagination()
        await this.loadEmailsWithPagination([['active', '=', true], ['is_deleted', '=', false]])
    }
      /**
     * Method to view starred mails.
     */
    async starredMail(){
        this.root.el.querySelector('.sent-mail')?.classList.add('active');
        this.root.el.querySelector('.archieved-mail')?.classList.remove('active');
        this.root.el.querySelector('.outbox')?.classList.remove('active');
        this.root.el.querySelector('.sent')?.classList.remove('active');
        this.root.el.querySelector('.all_mail')?.classList.remove('active');
        this.root.el.querySelector('.trash-mail')?.classList.remove('active');
        this.mailState.mailType = "starred"
        this.resetView()
        this.resetPagination()
        await this.loadEmailsWithPagination([['is_starred', '=', true], ['active', '=', true], ['is_deleted', '=', false]])
    }
     /**
     * Method to view archived mails.
     */
    async archivedMail(){
        this.root.el.querySelector('.archieved-mail')?.classList.add('active');
        this.root.el.querySelector('.sent-mail')?.classList.remove('active');
        this.root.el.querySelector('.outbox')?.classList.remove('active');
        this.root.el.querySelector('.sent')?.classList.remove('active');
        this.root.el.querySelector('.all_mail')?.classList.remove('active');
        this.root.el.querySelector('.trash-mail')?.classList.remove('active');
        this.mailState.mailType = 'archive'
        this.resetView()
        this.resetPagination()
        await this.loadEmailsWithPagination([['active', '=', false], ['is_deleted', '=', false]])
    }
     /**
     * Method to view outbox mails.
     */
   async outboxMailView(){
   this.root.el.querySelector('.outbox')?.classList.add('active');
   this.root.el.querySelector('.archieved-mail')?.classList.remove('active');
   this.root.el.querySelector('.sent-mail')?.classList.remove('active');
   this.root.el.querySelector('.sent')?.classList.remove('active');
   this.root.el.querySelector('.all_mail')?.classList.remove('active');
   this.root.el.querySelector('.trash-mail')?.classList.remove('active');
    this.mailState.mailType = "outbox"
    this.resetView()
    this.resetPagination()
    await this.loadEmailsWithPagination([['is_deleted', '=', false], '|', ['state', '=', 'exception'], ['state', '=', 'outgoing']])
    }
      /**
     * Method to view sent mails.
     */
    async sentMail(){
       this.root.el.querySelector('.sent')?.classList.add('active');
       this.root.el.querySelector('.archieved-mail')?.classList.remove('active');
       this.root.el.querySelector('.sent-mail')?.classList.remove('active');
       this.root.el.querySelector('.outbox')?.classList.remove('active');
       this.root.el.querySelector('.all_mail')?.classList.remove('active');
       this.root.el.querySelector('.trash-mail')?.classList.remove('active');
    this.mailState.mailType = 'sent'
    this.resetView()
    this.resetPagination()
    await this.loadEmailsWithPagination([['state', '=', 'sent'], ['is_deleted', '=', false]])
    }
     /**
     * Method to view trash mails.
     */
    async trashMailView(){
       this.root.el.querySelector('.trash-mail')?.classList.add('active');
       this.root.el.querySelector('.archieved-mail')?.classList.remove('active');
       this.root.el.querySelector('.sent-mail')?.classList.remove('active');
       this.root.el.querySelector('.outbox')?.classList.remove('active');
       this.root.el.querySelector('.all_mail')?.classList.remove('active');
       this.root.el.querySelector('.sent')?.classList.remove('active');
    this.mailState.mailType = 'trash'
    this.resetView()
    this.resetPagination()
    await this.loadEmailsWithPagination([['is_deleted', '=', true]])
    }
    /**
     * Method to redirect to the calendar view.
     */
     redirectCalender(){
     this.action.doAction("calendar.action_calendar_event", {
                additionalContext: {
                    search_default_mymeetings: 1,
                },
                clearBreadcrumbs: true,
            });
    }
     /**
     * Method to redirect to the contacts view.
     */
    redirectContacts(){
        this.action.doAction('base.action_partner_form');
    }
    /**
     * Method to search mails based on user input.
     */
    searchMail(){
      var value= this.root.el.querySelector(".header-search-input").value.toLowerCase()
      var inboxItems = this.root.el.querySelectorAll(".inbox-message-item");
      inboxItems.forEach(item => {
      var itemText = item.textContent.toLowerCase();
      item.style.display = itemText.includes(value) ? "" : "none";
    })
    }
}
odooMail.template = 'OdooMail'
odooMail.components = {
    MailBody, SentMail, ComposeMail,MessageView,ImportDialog
}
registry.category('actions').add('odoo_mail', odooMail);
