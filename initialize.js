/**
* HELP DESK POWERPACK - SPICEWORKS PLUGIN
* Compatible with Spiceworks 7.5.00088+
* @author Michael Maw (jMichael)
* @website https://www.michaelmaw.com/apps/help-desk-powerpack
* @version 3.5
* @date 2016-08-01
*/

/** CONFIGURATION PANEL SETTINGS */

plugin.configure({
  settingDefinitions:[
    { name:'ticketCounts', label:'Ticket Counts:', type:'enumeration', defaultValue:'Disabled', options:['Enabled', 'Disabled'] },
    { name:'ticketRows', label:'Ticket Rows:', type:'enumeration', defaultValue:'8', options:['4','6','8','10','12','14','16','18','20'] },
    { name:'viewOpts', label:'Ticket View Menu:', type:'text', defaultValue:'' },
    { name:'statsLeader', label:'Show Leaderboard:', type:'enumeration', defaultValue:'No', options:['Yes', 'No'] },
    { name:'statsRank', label:'Show Ranking:', type:'enumeration', defaultValue:'No', options:['Yes', 'No'] },
    { name:'statsTotals', label:'Show Tickets Closed:', type:'enumeration', defaultValue:'No', options:['Yes', 'No'] },
    { name:'deleteBtn', label:'Delete Button:', type:'enumeration', defaultValue:'Hide on Open Tickets', options: ['Show on Open Tickets', 'Hide on Open Tickets', 'Disable Completely'] },
    { name:'showFields', label:'Quick Entry Fields:', type:'text', defaultValue:'' },
    { name:'reqNew', label:'Required on New:', type:'text', defaultValue:'' },
    { name:'reqClose', label:'Required on Close:', type:'text', defaultValue:'' },
    { name:'reqOpts', label:'Required on:', type:'enumeration', defaultValue:'Close', options:['Close', 'Close, Close as Duplicate'] },
    { name:'timeSpent', label:'Time Spent:', type:'text', defaultValue:'' },
    { name:'contactFields', label:'Contact Info:', type:'text', defaultValue:'' },
    { name:'form', label:'Default Form:', type:'enumeration', defaultValue:'Public Response', options:['Public Response', 'Internal Note', 'Purchase'] },
    { name:'tidy', label:'Tidy Comments:', type:'text', defaultValue:'' },
    { name:'tidyMulti', label:'Tidy Multi-Line Comments:', type:'enumeration', defaultValue:'No', options:['Yes', 'No'] },
    { name:'tidyH', label:'Tidy Img Height:', type:'text', defaultValue:'' },
    { name:'tidyW', label:'Tidy Img Width:', type:'text', defaultValue:'' }
  ]
});

/** GLOBAL VARIABLES */

var HDPP;

/** LOAD CSS STYLESHEET */

plugin.includeStyles();

/** INITIALIZE PLUGIN */

!function($) {
  
  // ------------------------------------------------------------------------
  
  /** HELP DESK POWERPACK NAMESPACE */
  
  HDPP = {
    
    // Set to true to turn on console debugging
    debug: true,
    
    // Data placeholder
    data: [],

    // ------------------------------------------------------------------------
    
    /** UTILITY FUNCTIONS */
    
    // Display debug messages in console
    dbg: function(msg) {
      if (HDPP.debug && console) { console.log("[hdpp] " + msg); }
    },
    
    // Execute a callback function when an object is loaded into the DOM
    ready: function(obj, callback) {
      setTimeout(function() {         
        if ($(obj).length) { callback($(obj)); }
        else { 
          HDPP.ready(obj, callback);
        }
      }, 10);
    },
    
    // Show modal dialog
    msg: function(msg) { 
      $('<div id="hdpp-modal"><h1>Help Desk PowerPack</h1><div>' + msg + '</div><div id="hdpp-modal-footer"><button id="hdpp-modal-btn" type="button">Ok</button></div></div><div id="hdpp-modal-overlay"></div>').prependTo('body');
      $('#hdpp-modal-btn').on('click', function() {
        $('#hdpp-modal,#hdpp-modal-overlay').remove();
      });
    },
    
    // Capitalize first letter of each word
    caps: function(str) {
      if (typeof str !== 'string') { return str; }
      return str.replace(/\b\w+\b/g, function(word) {
        return word.substring(0,1).toUpperCase() + word.substring(1);
      });
    },
    
    // Convert a friendly time (ie. 10m, 1h, 3d) into a real time value (in minutes)
    time: function(val) {
      var unit;
      if (val.search(' ') > 0) {
        // Handle complex times (ie. "1d 30m")
        return HDPP.time(val.split(' ')[0]) + HDPP.time(val.split(' ')[1]);
      } else {
        // Handle simple times (ie. "45m")
        unit = val.slice(-1);
        val = parseInt(val.replace(unit, ""), 10);
      }
      
      // Convert hours and days to minutes
      if (unit === "h") { val = val * 60; }
      if (unit === "d") { val = val * 60 * 8; }
      return val;
    },
    
    // Convert a CSV string into <SELECT> options
    toOpts: function(csv) {
      var opts = '';
      $.each(csv.split(','), function() {
        var val = $.trim(this);
        if (val) { opts += '<option value="' + val + '">' + val + '</option>'; }
      });
      return opts;
    },
    
    // Convert a list of options/inputs into CSV
    toCSV: function(obj) {
      return $(obj).map(function() { return ($.trim($(this).val()) !== '') ? $(this).val() : null; }).get().join();
    },
    
    // Sort a list of <SELECT> options
    sort: function(list) {
      if (!list) { return; }
      list = (list.indexOf(',') !== -1) ? list.split(',') : [ list ];
      for (var l = 0; l < list.length; l++) {
        var opts = $(list[l]).children().sort(function(a, b) { 
          a = $(a).text();
          b = $(b).text();
          return (a < b) ? -1 : (a > b) ? 1 : 0;
        });
        $(list[l]).html(opts);
      }
    },
    
    // ------------------------------------------------------------------------
    
    /** PLUGIN INIT */
    
    init: function() {

      // Extend jQuery to make a case-insensitive text selector (used to find custom fields)
      $.extend($.expr[":"], {
        "icontains": function(elem, i, match, array) {
          return $.trim((elem.textContent || elem.innerText || "").toLowerCase()) === (match[3] || "").toLowerCase();
        }
      });
      
      // Help Desk
      if (location.href.indexOf('/tickets') !== -1) {
        HDPP.ticket.init();
      }
      
      // Settings
      if (location.href.indexOf('/settings') !== -1) {
        
        // EVENT: Plugin list refreshed
        SPICEWORKS.observe("plugin:componentRendered", function() {
          if (location.href.indexOf('/settings/apps') !== -1) {
            HDPP.settings.init();
          }
        });
        
        // EVENT: Settings form events
        $('body').on('click', '#HDPP button[hdpp-add]', function() {
          // Add option
          var select = $($(this).attr('hdpp-add')), val = $(this).prev().val();
          if ($.trim(val) !== '' && !select.find('option[value="' + val + '"]').length) {
            select.append('<option value="' + val + '">' + val + '</option>');
            if ($(this).attr('hdpp-sort') !== 'false') { HDPP.sort(select); }
            $(this).prev().val('');
          }
        }).on('click', '#HDPP button[hdpp-del]', function() {
          // Delete option(s)
          $($(this).attr('hdpp-del') + ' option:selected').remove();
        }).on('click', '#HDPP button[hdpp-up]', function() {
          // Move option up
          var opt = $($(this).attr('hdpp-up') + ' option:selected:first');
          if (opt && opt.prev().length) { opt.after(opt.prev()); }
        }).on('click', '#HDPP button[hdpp-down]', function() {
          // Move option down
          var opt = $($(this).attr('hdpp-down') + ' option:selected:first');
          if (opt && opt.next().length) { opt.before(opt.next()); }
        }).on('focus blur', '#hdpp-timeSpent input', function(e) {
          // Time Spent focus/blur
          $(this).parent().toggleClass('active');
          if (e.type === 'focus') {$(this).select(); }
        }).on('click keydown', '#hdpp-reqClose', function() {
          $('#hdpp-reqValForm').hide();
        }).on('click', 'button.hdpp-editReqVal', function() {
          // Edit Required Values
          HDPP.settings.reqVal.edit();
        }).on('click', 'button.hdpp-saveReqVal', function() {
          // Save Required Values
          HDPP.settings.reqVal.save();
        });
      }
    },
    
    // ------------------------------------------------------------------------
    
    /** HELP DESK TICKET */
    
    ticket: {
      
      // # of ticket errors (required fields)
      errors: 0,
      
      // List of ticket fields with errors
      errorFlds: '',
      
      // Init plugin on help desk
      init: function() {

        // Event handlers
        $UI.app.pluginEventBus.on("app:helpdesk:ticket:new:show", function() {
          HDPP.ticket.reqNew();
        });
        
        $UI.app.pluginEventBus.on("app:helpdesk:ticket:new:add", function() {
          HDPP.ticket.counts();
        });
        
        $UI.app.pluginEventBus.on("app:helpdesk:ticket:change:status", function() {
          HDPP.ticket.stats();
          HDPP.ticket.counts();
        });
        
        $UI.app.pluginEventBus.on("app:helpdesk:ticket:header:render", function() {
          HDPP.ticket.counts();
          HDPP.ticket.delBtn();
          HDPP.ticket.quickEntry();
          HDPP.ticket.reqClose();
        });
        
        $UI.app.pluginEventBus.on("app:helpdesk:ticket:show", function() { 
          HDPP.ticket.stats();
          HDPP.ticket.counts();
          HDPP.ticket.rows();
          HDPP.ticket.delBtn();
          HDPP.ticket.quickEntry();
          HDPP.ticket.reqClose();
          HDPP.ticket.defCmt();
        });
        
        HDPP.ticket.timeSpent();
        
        $(document).ajaxComplete(function() { 
          HDPP.ticket.contacts();
          HDPP.ticket.tidy();
          if ($('#hdpp-creator').length) { $('#hdpp-creator').text($('.user-info.creator .front p.title').text()); }
          if ($('#hdpp-labor-total').length) { $('#hdpp-labor-total').text($('.labor-total').text().replace('Total: ', '')); }
        });
        
        // Mouse hover on Leaderboard
        $('body').on('mouseover mouseout', '#hdpp-leaders', function() {
          $(this).find('ul').toggle();
        });
        
        // Init stats, counts, and views on first load
        HDPP.ready('#helpdesk', function() {
          HDPP.ticket.stats();
          HDPP.ticket.counts();
          HDPP.ticket.views();
        });
        
      },
      
      // Mark form errors (ie. required fields that are empty, etc)
      err: function(fld) {
        HDPP.ticket.errors++;
        HDPP.ticket.errorFlds += "<li>" + HDPP.caps(fld) + "</li>";
      },
      
      // Notify user of form field errors
      errMsg: function(e) {
        
        // Prevent default button action (don't save/close the ticket)
        e.preventDefault();
        e.stopImmediatePropagation();
        
        // Display error msg on New Ticket form
        if ($("#new-ticket-dialog").is(":visible")) {
          HDPP.ticket.errorFlds = HDPP.ticket.errorFlds.replace(/<\/li><li>/gi, ", ").replace(/<[^>]+>/gi, "");
          $("#new_ticket_errors").html(HDPP.ticket.errors + ' required fields are empty: ' + HDPP.ticket.errorFlds).show();
          window.scrollTo(0, 0);
        } else {
          // Show error message
          HDPP.msg(HDPP.ticket.errors + ' required fields contain unacceptable values:<ul>' + HDPP.ticket.errorFlds + '</ul>');
        }
        
        // Reset fields & counts
        $(".hdppRequired").removeClass(".hdppRequired");
        HDPP.ticket.errors = 0;
        HDPP.ticket.errorFlds = '';
      },
      
      // Get ticket fields/values
      fields: function() {
        var attr = Backbone.Relational.store.find($UI.app.HelpDesk.Common.Models.Ticket, SPICEWORKS.app.helpdesk.selectedTicket.get('id')).attributes;
        var flds = attr.custom_attrs || [];
        
        // Combine standard fields with custom fields
        return flds.concat([ 
          { label: "Assignee", name: "assignee", value: attr.assignee.first_name + ' ' + (attr.assignee.last_name || '') }, 
          { label: "Category", name: "category", value: attr.category }, 
          { label: "Time Spent", name: "time_spent_duration", value: attr.time_spent_duration }, 
          { label: "Due Date", name: "due_at", value: attr.due_at }, 
          { label: "Priority", name: "priority", value: attr.priority }, 
          { label: "Related Items", name: "related_items", value: attr.related_items.length },
          { label: "Public Response", name: "public_response", value: $('textarea.helpdesk-comment').val() }
        ]);
      },
      
      // Help Desk Rankings & Stats
      stats: function() {
        var stats = [ (plugin.settings.statsLeader === "Yes"), (plugin.settings.statsRank === "Yes"), (plugin.settings.statsTotals === "Yes") ];
        if (!stats[0] && ! stats[1] && !stats[2]) { return; }
        
        var userid = SPICEWORKS.app.user.id;
        
        // Construct queries
        var opts = {};
        if (stats[2]) {
          opts = { 
            'Closed in 30 Days': { 
              'class': 'Ticket', 
              'conditions': 'assigned_to = ' + userid + ' AND closed_at >= datetime("now","-30 days") AND closed_at <= datetime("now") AND status="closed"', 
              'count': true 
            },
            'Closed in 7 Days': { 
              'class': 'Ticket', 
              'conditions': 'assigned_to = ' + userid + ' AND closed_at >= datetime("now","-7 days") AND closed_at <= datetime("now") AND status="closed"', 
              'count': true
            }
          };
        }
        if (stats[0] || stats[1]) {
          opts.Ranking = {
            'class': 'Ticket',
            'select': 'assigned_to, COUNT(*) AS total',
            'conditions': 'closed_at >= datetime("now","-7 days") AND closed_at <= datetime("now") AND status="closed"',
            'group': 'assigned_to',
            'order': 'total DESC'
          };
        }

        SPICEWORKS.data.query(opts, function(data) {
          if ($('#hdpp-stats').length !== 1) { $('<div id="hdpp-stats"></div>').prependTo('#helpdesk'); }
          var html = '', rankdesc = 'N/A', lb = '';
          
          $.each(data, function(n, v) {
            if (n === 'Ranking') {
              
              var top = (v.length - 1) < 9 ? v.length - 1 : 9;
              
              // Cycle through each help desk tech
              for (var r = 0; r < v.length; r++) {
                
                // Format ranking
                var expr = ['st', 'nd', 'rd', 'th'];
                var rank = (r + 1) + expr[(r > 2 ? 3 : r)];
                
                // Populate leaderboard
                if (stats[0] && r <= top) {
                  lb += '<li' + (r === 0 ? ' style="font-weight: bold;"' : '') + '>' + rank + ' - ' + v[r].assignee.first_name + ' ' + v[r].assignee.last_name + ' (' + v[r].total + ')</li>';
                }
                
                if (v[r].assignee.id === userid) { 
                  rankdesc = rank + ' out of ' + v.length;
                }

                if (r >= top && rankdesc) { v = stats[1] ? rankdesc : ''; break; }
              }
            }
            if (v !== '') { html += '<div><label>' + n + ':</label> <span>' + v + '</span></div>'; }
          });
          
          // Show Stats & Ranking toolbar
          $('#hdpp-stats').html(html);
          
          // Show Leaderboard
          if (stats[0]) { 
            $('#hdpp-stats').prepend('<div id="hdpp-leaders"><label>Leaderboard</label><ul style="display:none;">' + (lb || '<li>Leaders are lacking - close some tickets!</li>') + '</ul></div>'); 
          }
        });
      },
      
      // Ticket rows
      rows: function() {
        var rows = $(".ticket-list > tr");
        var showrows = parseInt(plugin.settings.ticketRows || 8);

        // If fewer rows than the user selected, shrink viewing area
        showrows = (showrows > rows.length) ? rows.length : showrows;

        $(".ticket-table-wrapper:not(.hdpp)").addClass("hdpp").height(rows.first().height() * showrows);
      },
      
      // Ticket counts
      counts: function() {
        if (plugin.settings.ticketCounts === "Enabled") {
          
          HDPP.dbg('Ticket counts');
          
          // Ticket Views
          var views = [ 
            ["Open Tickets", "open"], 
            ["Past Due Tickets", "past_due"],
            ["Recently Updated", "recent"],
            ["Unassigned Tickets", "unassigned"],
            ["Closed Tickets", "closed"],
            ["Active Tickets", "active"],
            ["Waiting Tickets", "waiting"],
            ["My Tickets", "open_and_assigned_to_current_user"],
            //["Vendor/Service Tickets", "it_services"],
            ["Purchase Needed", "requiring_purchase"],
            ["All Tickets", ""]
          ];
          
          // Show ticket counts
          $.each(views, function() {
            var view = this[0], filter = this[1];
            if (filter !== "") { filter = "&filter=" + this[1]; }
            
            new Ajax.Request('/api/tickets.json?total_count=true' + filter, {
              method:'get',
              onSuccess: function(transport) {
                var total = (transport.responseText.evalJSON().count || '0');
                var title = $(".page-header > h1 .sui-dropdown > a");
                var option = $(".page-header li a");
                
                // Add total to menu title
                if (title.text().replace(/\s\([0-9]+\)/gi, '') === view) { 
                  title.html(title.text().replace(/\s\(.+/gi, '') + ' (' + total + ')<b class="caret" />');
                }
                
                // Add total to menu option
                $.each(option, function() {
                  if ($(this).text().replace(/\s\([0-9]+\)/gi, '') === view) { 
                    $(this).text(view + " (" + total + ")");
                  }
                });
              }
            });
          });
        }
      },
      
      // Ticket view dropdown menu
      views: function() {
        var views = plugin.settings.viewOpts;
        if (!views) { return; }

        var dd = $('.ticket-views.sui-dropdown-menu');
        dd.find('li:lt(13)').hide();
        dd.find('li:gt(12)').addClass('custom');

        $.each((views.indexOf(',') > 0 ? views.split(',') : [ views ]), function() {
          var opt = dd.find('a[data-view="' + this.replace(/ /g, '_').toLowerCase() + '"]').parent();
          if (opt.length) {
            dd.append(opt.show());
          }
        });
        
        dd.find('li.custom').appendTo(dd);
      },
      
      // Required fields on New Ticket form
      reqNew: function() {
        if (plugin.settings.reqNew !== "") {
          
          var form = $("#new-ticket-dialog"), fld;
          
          // When Save button is clicked...
          form.find('button[data-button-type="submit"]').on('mousedown keydown', function(e) {
            var reqFlds = plugin.settings.reqNew;
            
            // Cycle through each required field
            $.each(reqFlds.toLowerCase().split(","), function() {
              var rf = $.trim(this);
              
              // Get field label
              var lbl = form.find("label:icontains('" + rf + "')");
              if (lbl.length) {
                
                // Handle special fields
                if ($.inArray(rf, ["contact", "related to", "cc users"]) !== -1) {
                  fld = lbl.next().find(".select2-choices,.select2-container");
                  if (!fld.find('.select2-search-choice,.select2-choice span:not(:empty)').length) {
                    HDPP.ticket.err(rf);
                  } else {
                    fld.trigger("focus");
                  }
                }
                
                // Regular fields
                else {
                  fld = lbl.next().find(':input:visible:first,select[name="ticket[category]"]:hidden');
                  var val = $.trim(fld.val());
                  if (val === "" || val === "UNASSIGNED") {
                    HDPP.ticket.err(rf);
                  }
                }
              }
            });
            
            // Notify user
            if (HDPP.ticket.errors > 0) {
              HDPP.ticket.errMsg(e);
              return false;
            }
          });
        }
      },
      
      // Required fields on close
      reqClose: function() {
        if (plugin.settings.reqClose !== "") {

          var form = $("#ticket_pane");
          
          // Check on Close and also on Close as Duplicate
          var buttons = ".ticket-close-button,.close-with-comment,.comment-action label.checkbox";
          if (plugin.settings.reqOpts === "Close, Close as Duplicate") {
            buttons += ",.ticket-dup-button";
          }
          
          // Event trigger
          $(buttons).on("mousedown keydown", function(e) { 
            
            // For keystrokes, only handle ENTER and SPACE
            if (e.type === 'keydown' && e.which !== 13 && e.which !== 32) { return; }
            
            HDPP.ticket.errors = 0;
            HDPP.ticket.errorFlds = '';
            var flds = HDPP.ticket.fields();

            // Cycle through all required fields
            $.each(plugin.settings.reqClose.toLowerCase().split(','), function() {
              var rf = $.trim(this), rvalues = '';
              if (rf.indexOf(':') !== -1) {
                rvalues = rf.split(':')[1];
                rf = rf.split(':')[0];
              }
              var fld = $.grep(flds, function(f, i) {
                return f.label.toString().toLowerCase() === rf;
              });
              
              // Field doesn't exist!
              if (!fld.length) { return; }
              
              var val = (fld[0].value || '').toString().toLowerCase();
              
              HDPP.dbg('Validating ' + rf + ' = "' + val + '" (Req. Values: ' + rvalues + ')');
              
              // Check for empty values
              if (!val || val === '0m') { 
                HDPP.ticket.err(rf); 
              }
              
              // Check for user-specified required values
              else if (rvalues) {
                rvalues = (rvalues.indexOf('|') !== -1) ? rvalues.split('|') : [ rvalues ];
                if ($.inArray(val, rvalues) === -1) {
                  HDPP.ticket.err(rf);
                }
              }
              
            });
            
            // Notify user
            if (HDPP.ticket.errors > 0) {              
              HDPP.ticket.errMsg(e);
              return false;
            }
          });
        }
      },
      
      // Show or hide the delete button
      delBtn: function() {
        
        // Show Delete Button
        if (plugin.settings.deleteBtn.search('Show') > -1) {

          var deletebtn = $('.delete-button-wrapper');
          if (deletebtn.css('display') === 'none') {
            
            // Custom delete ticket handler
            deletebtn.css('display', 'inline-block').on('click', function(e) {
              e.stopImmediatePropagation();
              
              if (window.confirm(I18n.t('helpdesk.status.delete_confirm'))) {
                var ticketID = SPICEWORKS.app.helpdesk.selectedTicket.get('id');
                var thisModel = Backbone.Relational.store.find($UI.app.HelpDesk.Common.Models.Ticket, ticketID);
                thisModel.save('muted', 'true');
                thisModel.save('status', 'closed', {
                  success: function() {
                    thisModel.destroy($UI.withGrowlMessages({
                      wait:true,
                      caption: I18n.t('growl_messages.deleting'),
                      success: function() {
                        thisModel.set('destroyed', true);
                        //view.trigger($UI.app.HelpDesk.Common.Constants.Events.TicketDeleted, thisModel);
                        HDPP.msg('Ticket deleted successfully');
                        location.reload();
                      },
                      error: function(m,response) {
                        return response.status===401 ? I18n.t('helpdesk.growl_messages.delete_disabled') : I18n.t('growl_messages.error');
                      }
                    }));
                  }
                });
              }
              return false;
            });
          }
        }
        
        // Disable Delete Button
        else if (plugin.settings.deleteBtn.search('Disable') > -1) {
          $('.delete-button-wrapper').hide();
        }
      },
      
      // Show quick entry fields
      quickEntry: function() {
        if (plugin.settings.showFields !== "") {
          
          if ($(".hdppQEntry").length) { return; }
          
          var row;
          var n = 0;
          
          // Hide the default ribbon
          var def = $('.ticket-ribbon div.sui-row-fluid:first').hide();
          
          // Cycle through each field
          $.each(plugin.settings.showFields.split(','), function() {
            
            // Add new row to Quick Entry toolbar
            var row = $('.ticket-ribbon div.hdppQEntry:last');
            if (!row.length || (row.length && row.children().length === 6)) {
              row = $('<div class="hdppQEntry sui-row-fluid" />').appendTo('.ticket-ribbon > div');
            }

            var fld = $.trim(this);
            
            // Ignore category fields if XML Subcategories plugin is active
            if ($.inArray(fld, ['Category', 'First Sub Cat', 'Second Sub Cat', 'Third Sub Cat', 'Fourth Sub Cat']) !== -1 && $('#cssmenu1 #breadcrumbs').length > 0) { return; }
          
            // Labor Total field
            if (fld === 'Labor Total') {
              $('<div class="span2"><h4>Labor Total</h4><span id="hdpp-labor-total">' + $('.labor-total').text().replace('Total: ', '') + '</span></div>').appendTo(row);
            } else if (fld === 'Creator') {
              $('<div class="span2"><h4>Creator</h4><span id="hdpp-creator">' + $('.user-info.creator .front p.title').text() + '</span></div>').appendTo(row);
            } else {
              var f = $("#ticket_pane dl.custom dt:icontains('" + fld + "')");
              if (f.length) {
                // Custom fields
                f.next("dd").show().appendTo($('<div class="span2"><h4>' + fld + '</h4></div>').appendTo(row));
                f.remove();
                n++;
              } else {
                // Standard fields
                f = def.find('.span2 h4:icontains("' + fld + '")');
                if (f.length) { f.next().show().parent().show().appendTo(row); }
              }
            }
          });
        }
      },
      
      // Customize time spent options
      timeSpent: function(open) {
        
        if (!open) {
          if (plugin.settings.timeSpent !== "") {
            // Give the popup time to show before modifying options
            $("body").on("mouseup hdppTime", ".labor-clickover, .time-spent-dropdown .pencil", function() {       
              HDPP.ready('.labor-popover', function() {
                HDPP.ticket.timeSpent(true);
              });
            });
          }
        } else {
          var opts = plugin.settings.timeSpent.toLowerCase().split(',');
          var n = 0;
          var li = $('.labor-popover:visible li[data-add-time]');
          
          // Cycle through each custom time spent option
          $.each(opts, function() {
            
            // Only allow 4 options max.
            if (n > 3) { return; }
            
            var val = 0, opt = $.trim(this);
            
            // Get the real value in minutes
            val = HDPP.time(opt);
            
            // Update options
            $(li[n]).attr("data-add-time", val).text("+" + opt);
            n++;
          });
        }
      },
      
      // Set default comment form
      defCmt: function() {
        $(".activity-contents .actions > li:contains('" + plugin.settings.form + "')").click();
      },
      
      // Tidy up ticket comments
      tidy: function() {
        if (!$('.ticket-list tr').length) { return; }
        
        HDPP.ready('.ticket-pane-content .comments', function(obj) {
          
          HDPP.dbg('Tidy comments');
          
          var cmts = obj.find('.activity-event');
          var tidyW = plugin.settings.tidyW, tidyH = plugin.settings.tidyH;
          var keywords = plugin.settings.tidy.toLowerCase();
          if (keywords) { keywords = keywords.indexOf(',') !== -1 ? keywords.split(',') : [ keywords ]; }
          
          // Cycle through each comment
          $.each(cmts, function() {
            var cmt = $(this), data = '';
            
            // Remove small image attachments
            var att = cmt.find('.dl-link-name');
            if (tidyW && tidyH && att.length) {
              var filename = att.attr('title');
              var ext = filename.substr(filename.lastIndexOf('.') + 1);
              
              if ($.inArray(ext, ['jpg', 'gif', 'png', 'bmp']) !== -1) {
                var div = $('<div style="display:none"></div>').appendTo(cmt.find('.activity-item'));
                $('<img />').appendTo(div).attr('src', att.attr('href')).on('load', function() {
                  if (this.width <= Number(tidyW) && this.height <= Number(tidyH)) {
                    cmt.hide();
                  }
                  $(this).remove(); // Cleanup temp img
                });
              }
            } else if (keywords.length > 0) {
              
              // Tidy up text comments
              var txt = (cmt.hasClass('labor') ? cmt.find('h5.activity-header') : cmt.find('p.body')).html().toString().toLowerCase();
              txt = $.trim(txt.replace(/(\r\n|\n|\r)/gi, '!#BR#!').replace(/<[^>]*>/gi, ' '));
              
              // Ignore multi-line comments (unless enabled)
              if (plugin.settings.tidyMulti !== 'Yes' && txt.match(/!#BR#!/g).length > 2) { return; }
              
              $.each(keywords, function() {
                var kw = $.trim(this);
                if (txt.indexOf(kw) !== -1) {
                  cmt.hide();
                }
              });
            }
          });
        });
      },
      
      // Show customized contact info on ticket
      contacts: function() {
        if (plugin.settings.contactFields !== "") {
          
          fields = plugin.settings.contactFields.split(',');
          
          $("div.user-card p.additional").addClass("hdpp").each(function() {
            
            HDPP.dbg('Populating contact card');
            
            var card = $(this);
            var data = card.closest(".user-info").data("hdpp");
            var userid = card.parent().find(".title").attr("data-id");
            
            // Use cached data to avoid round-trip to the server
            if (data && data[1] === userid) {
              card.html(data[0]).closest(".card").height(data[1]);
            } 
            
            // Retrieve data from People module
            else {
              SPICEWORKS.data.query({ 'udata': { 'class': 'User', 'conditions': 'id="' + userid + '"' }}, function(results) {
                data = results.udata[0];
                var details = "";
                var n = 0;
                
                // Show requested contact details
                $.each(fields, function(i, fld) {
                  fld = $.trim(fld.toLowerCase().replace(/ /gi, "_"));
                  var val = data[fld];
                  
                  // Handle custom attributes
                  if (!val && data["c_" + fld] !== undefined) { val = data["c_" + fld]; }
                  
                  if (val) { 
                    details += '<span title="' + $.trim(fields[i]) + '">' + val + '</span>';
                    n++;
                  }
                });
                
                // Populate contact details and adjust card height
                var h = 88 + ((n - 2) * 14);
                card.html(details).closest(".card").height(h).closest(".user-info").data("hdpp", [ details, h ]);
              });
            }
          });
        }
      }
    },
    
    // ------------------------------------------------------------------------
    
    /** SETTINGS */
    
    settings: {
      
      // App placeholder
      app: null,
      
      // Settings Form placeholder
      form: null,
      
      loading: false,
      
      // Initialize the settings form
      init: function(ready) {

        if (!ready) {
          // Cancel if already init'd
          if (HDPP.settings.loading || $('.sw-app-row.hdpp').length) { return; }
          
          HDPP.dbg('settings init');
          HDPP.settings.loading = true;
          
          HDPP.ready('.sw-app-name:contains("Help Desk PowerPack")', function(obj) {
            HDPP.settings.app = obj.closest('.sw-app-row').addClass('hdpp');
            HDPP.settings.init(true);
          });
          
        } else {
          HDPP.dbg('Set logo');
          
          // Show app logo (override default icon)
          var logo = HDPP.settings.app.find('.sw-app-icon > img');
          logo.attr('src', plugin.contentUrl('logo.png'));
          
          // EVENT: Show plugin settings
          HDPP.settings.app.find('.sw-app-configure-link').on('mouseup', function() {
            if (!HDPP.settings.app.find('.plugin-configure').length) {
              HDPP.ready('.hdpp .plugin-configure > form', function(obj) {         
                HDPP.settings.form = obj;
                HDPP.settings.load(obj);
              });
            }
          });
          
          HDPP.settings.loading = false;
        }
      },
      
      // Load the settings form
      load: function(f) {
        if ($('#HDPP').length) { return; }
        
        $('<div id="HDPP"></div>').insertBefore(f.find('div:last'));
        
        // Load configuration options
        plugin.renderHtmlTemplate('settings.html', {}, function(content) {
          f = $('#HDPP');
          f.html(content);
          
          // Enable blue marker auto-adjust
          f.on('click', '.nav-tabs li', function() {
            HDPP.settings.adjust();
          });
          HDPP.settings.adjust();
          
          // Event: Set defaults on blur
          f.on('blur', 'input[default]', function() {
            if ($.trim($(this).val()) === '') { $(this).val($(this).attr('default')); }
          });
          
          // Get data
          var data = HDPP.settings.form.find('div.setting input[name^="data"]').val();
          HDPP.data = (!data) ? [] : $.parseJSON(data);
          HDPP.dbg(JSON.stringify(HDPP.data).replace(/\\/gi, ''));
          
          HDPP.settings.populate();
        });
        
        // Add validation to plugin "Save" button
        HDPP.settings.app.find('.sui-bttn-primary').on('mousedown', function(e) {
          if (!HDPP.settings.validate()) {
            e.stopImmediatePropagation();
            return false;
          }
        });
      },
      
      // Populate app settings form
      populate: function() {
        
        //var dataLookup = new Backbone.Model();
        //var ticketViews = dataLookup.get('ticketViews');
        
        // Populate dropdown fields
        $.ajax({
          url: '/api/custom_attributes'
        }).done(function(data) {
          var lists = [ '#hdpp-viewOpts', '#hdpp-showFieldsOpts', '#hdpp-contactOpts', '#hdpp-reqNewOpts', '#hdpp-reqCloseOpts' ];
          var std = [
            [ "Unassigned Tickets", "Open Tickets", "Closed Tickets", "Active Tickets", "Waiting Tickets", "Past Due Tickets", "Recently Updated", "My Tickets", "Vendor/Service Tickets", "Purchase Needed", "All Tickets", "Active Alerts", "Shared Tickets" ],
            [ "Assignee", "Category", "Creator", "Due Date", "Labor Total", "Last Activity", "Priority", "Time Spent" ],
            [ "Title", "Location", "Department", "Email", "Home Page", "Office Phone", "Cell Phone", "Role", "Start Date" ],
            [ "Assigned To", "Attachment", "Category", "CC Users", "Contact", "Description", "Due Date", "Due Time", "Priority", "Related To", "Summary" ],
            [ "Assignee", "Category", "Due Date", "Priority", "Public Response", "Related Items", "Time Spent" ]
          ];
          
          // Get custom fields
          var ticket = [], contact = [];
          $.each(data.custom_attributes, function() {
            if (this.model === 'Ticket') {
              ticket.push(this.label);
            }
            else if (this.model === 'User') {
              contact.push(this.label);
            }
          });

          // Populate with options list
          for (var l = 0; l < lists.length; l++) {
            var opts = '', custom = (l === 2 ? contact: ticket);
            $.each((l > 0 ? std[l].concat(custom) : std[l]), function() {
              opts += '<option value="' + this + '">' + this + '</option>';
            });
            $(lists[l]).html(opts);
          }

          // Sort and prepend with "Select..."
          lists = lists.join();
          HDPP.sort(lists);
          $(lists).prepend('<option value="">Select...</option>');
        });
        
        var flds = HDPP.settings.form.find('div.setting :input');
        
        // Transpose values
        $('#hdpp-counts').prop('checked', (flds.filter('[name^="ticketCounts"]').val() === 'Enabled'));
        $('#hdpp-rows').val(flds.filter('[name^="ticketRows"]').val());
        $('#hdpp-views').html(HDPP.toOpts(flds.filter('[name^="viewOpts"]').val()));
        $('#hdpp-stats-leader').prop('checked', (flds.filter('[name^="statsLeader"]').val() === 'Yes'));
        $('#hdpp-stats-rank').prop('checked', (flds.filter('[name^="statsRank"]').val() === 'Yes'));
        $('#hdpp-stats-totals').prop('checked', (flds.filter('[name^="statsTotals"]').val() === 'Yes'));
        $('#hdpp-default').val(flds.filter('[name^="form"]').val());
        $('#hdpp-deleteBtn').val(flds.filter('[name^="deleteBtn"]').val());
        $('#hdpp-showFields').html(HDPP.toOpts(flds.filter('[name^="showFields"]').val()));
        $('#hdpp-contactFields').html(HDPP.toOpts(flds.filter('[name^="contactFields"]').val()));
        $('#hdpp-reqNew').html(HDPP.toOpts(flds.filter('[name^="reqNew"]').val()));
        $('#hdpp-reqClose').html(HDPP.toOpts(flds.filter('[name^="reqClose"]').val()));
        $('#hdpp-reqOpts').prop('checked', (flds.filter('[name^="reqOpts"]').val() === 'Close, Close as Duplicate'));
        $('#hdpp-tidy').html(HDPP.toOpts(flds.filter('[name^="tidy"]').val()));
        $('#hdpp-tidyMulti').prop('checked', (flds.filter('[name^="tidyMulti"]').val() === 'Yes'));
        $('#hdpp-tidyH').val(flds.filter('[name^="tidyH"]').val());
        $('#hdpp-tidyW').val(flds.filter('[name^="tidyW"]').val());
        
        // Parse Required Values
        $.each($('#hdpp-reqClose option'), function() {
          var val = $(this).val();
          if (val.indexOf(':') !== -1) { $(this).text(val.split(':')[0] + '*'); }
        });
        
        // Time Spent values
        var ts = flds.filter('[name^="timeSpent"]').val();
        if (ts.indexOf(',') !== -1) {
          $.each(ts.split(','), function(i, v) {
            $('#hdpp-timeSpent div:eq(' + i + ') input').val($.trim(v));
          });
        }
        
        HDPP.sort('#hdpp-reqNew,#hdpp-reqClose,#hdpp-tidy');
      },

      // Validate app settings
      validate: function() {
        HDPP.settings.save();
        return true;
      },
      
      // Save app settings
      save: function() {
        var flds = HDPP.settings.form.find('div.setting :input');

        // Transpose values
        var values = {
          "ticketCounts" : ($('#hdpp-counts').prop('checked') ? 'Enabled' : 'Disabled'),
          "ticketRows" : $('#hdpp-rows').val(),
          "viewOpts" : HDPP.toCSV('#hdpp-views option'),
          "statsLeader" : ($('#hdpp-stats-leader').prop('checked') ? 'Yes' : 'No'),
          "statsRank" : ($('#hdpp-stats-rank').prop('checked') ? 'Yes' : 'No'),
          "statsTotals" : ($('#hdpp-stats-totals').prop('checked') ? 'Yes' : 'No'),
          "form" : $('#hdpp-default').val(),
          "deleteBtn" : $('#hdpp-deleteBtn').val(),
          "timeSpent" : HDPP.toCSV('#hdpp-timeSpent input'),
          "showFields" : HDPP.toCSV('#hdpp-showFields option'),
          "contactFields" : HDPP.toCSV('#hdpp-contactFields option'),
          "reqNew" : HDPP.toCSV('#hdpp-reqNew option'),
          "reqClose" : HDPP.toCSV('#hdpp-reqClose option'),
          "reqOpts": ($('#hdpp-reqOpts').prop('checked') ? 'Close, Close as Duplicate' : 'Close'),
          "tidy" : HDPP.toCSV('#hdpp-tidy option'),
          "tidyMulti" : ($('#hdpp-tidyMulti').prop('checked') ? 'Yes' : 'No'),
          "tidyH" : $('#hdpp-tidyH').val(),
          "tidyW" : $('#hdpp-tidyW').val()
        };
        
        $.each(values, function(n, v) {
          flds.filter('[name^="' + n + '"]').val(v);
        });
        
        HDPP.dbg('Settings Saved');
      },
      
      // Adjust app blue marker height
      adjust: function() {
        setTimeout(function() {
          $('#sw-app-row-marker').height($('.hdpp').height() - 5);
        }, 150);
      },
      
      // Required values
      reqVal: {
      
        // Edit required values
        edit: function() {
          var fld = $('#hdpp-reqClose option:selected');
          if (fld.length !== 1) {
            HDPP.msg('Select a single Required Field from the list first');
            return;
          }
          
          $('#hdpp-reqVal').val(fld.val().indexOf(':') !== -1 ? fld.val().split(':')[1] : '');
          $('#hdpp-reqValForm').show();
        },
        
        // Save required values
        save: function() {
          var val = $.trim($('#hdpp-reqVal').val());
          var fld = $('#hdpp-reqClose option:selected');
          var fldname = fld.val().indexOf(':') !== -1 ? fld.val().split(':')[0] : fld.val();

          if (val) {
            fld.val(fldname + ':' + val).text(fldname + '*');
          } else {
            fld.val(fldname).text(fldname);
          }
          
          $('#hdpp-reqValForm').hide();
        }
      }
    }
    
  };

}(jQuery);

SPICEWORKS.ready(function() { HDPP.init(); });​