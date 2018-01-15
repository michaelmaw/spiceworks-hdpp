# Help Desk PowerPack - Spiceworks Plugin

A free plugin for the Spiceworks Help Desk that enables a set of highly requested features: ticket counts, required fields, quick entry fields & contact details on tickets, plus more!

Official Website: https://www.michaelmaw.com/apps/help-desk-powerpack/

![Screenshot](https://www.michaelmaw.com/wp-content/uploads/2016/04/HDPP-Help-Desk-Stats-Rankings.png)

## Current Features (Version 3.5 – Jan 14, 2018)

* Leaderboard: Display a list of the top 10 help desk techs (based on how many tickets they’ve closed in the last 7 days)
* Stats & Rankings: Display a toolbar on top of the ticket list showing the current user’s ticket totals (last 7 days/last 30 days) & ranking compared to other help desk techs
* Ticket View Menu: Change the order of the options on the ticket view dropdown menu, and/or remove certain options altogether
* Ticket List Height: Set the height of the ticket list when the Help Desk first loads. This will expand the viewable area to only show this number of tickets by default.
* Ticket Counts: Enabling this options will show the total number of tickets beside certain options in the ticket view dropdown menu (including the currently selected view)
* Default Comment Form: Choose whether the “Public Response”, “Internal Note” or “Purchase” comment form is shown by default when viewing a ticket
* Delete Button: Select an option to either show or hide the delete button on Open Tickets, or you can choose the 3rd option: Disable Completely, which will prevent anyone from deleting tickets.
* Time Spent: Enter a list of custom time options (ie. 5m, 10m, 15m, 1h, 2d, etc.) to show in the Time Spent popup options list on the ticket form. Using this feature completely overrides the existing list.
* Quick Entry Fields: Select which form fields you want to show on the quick entry ribbon for faster data entry, and choose the order they will appear. You can select from a list of all the default fields and any custom fields you have created.
* Contact Cards: Choose what contact attributes to display on the contact cards for the Assignee, Creator, and CC’d Users on the ticket Details tab. Available options include: Title, Location, Department, Email, Home Page, Office Phone, Cell Phone, Role, and Start Date (Yes, you can even use custom attributes you have created for the “People” module)
* Required Fields (New Tickets): Select which form fields you want to make sure are filled out when trying to create a new ticket (default fields and custom fields are both supported).
* Required Fields (on Close): Select which form fields you want to make sure are filled out when trying to close a ticket (default fields and custom fields are both supported). You can also specify “Required Values”.
* Tidy Comments/Images: Hide ticket comments containing small image attachments. As well, single- or multi-line comments with specific text can be hidden so you’re only left with the stuff that really matters!

## Known Issues/Limitations

* “Related Items” fields cannot be added to the Quick Entry toolbar
* Ticket counts are not available for Vendor/Service Tickets, Active Alerts, Shared Tickets, and any other custom ticket views
* Tickets can be closed via email without required field validation (currently, it is impossible to restrict this with the current plugin API provided by Spiceworks)

## FAQ

* Why can’t Help Desk Admins/Techs views contact details? Unfortunately, because these user groups don’t have access to the People module, they can’t access data from it. This is a restriction of the Spiceworks API. To get around this limitation, I created another plugin called Pepper Roles that allows you to define custom permissions, enabling access to data from the People module.
* Can I use this plugin to just show contact info? I don’t care about the other options. Yes, all fields are optional and by default they are all blank.
* How do I create custom form fields or contact info attributes that I can use with this plugin? Go to Settings – Help Desk – Custom Attributes and add them there. Make sure you designate them for the “Ticket” when you add attributes (or “Person” for contact fields).
* Can I change the order of the fields that show up on the Quick Entry ribbon? Yes, the fields will show up in whatever order you add them to the Quick Entry Fields configuration option.
