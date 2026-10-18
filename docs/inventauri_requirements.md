**INVENTAURI**

Production Management System

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Golden Studio · Faisalabad, Pakistan

Version 1.0 · Internal Use Only

Authored by Uzain Mubarak

1\. Overview

Inventauri is a boutique production management system built for Golden
Studio, a custom and bridal garment workshop based in Faisalabad,
Pakistan. It is designed to manage the full lifecycle of make-to-order
garments --- from the moment a client places an order to the final
dispatch and payment collection.

The system is built for internal use by studio staff, with planned
extensions for karigars (hand embellishment workers) and agents to log
their own unit data through a companion Android app in future versions.

2\. The Problem

Golden Studio operates a high-volume custom garment business serving
direct retail clients, freelance agents, and wholesale vendors. Before
Inventauri, the studio relied on paper records, WhatsApp images, and
verbal memory to manage production. This created four compounding
problems:

-   **Institutional Memory Loss ---** Orders arrived months after the
    original with only reference images and no written specs. Workers
    had no way to reproduce the exact embellishment technique, fabric
    combination, or border style --- leading to mistakes, rejections,
    and rework.

-   **Production Visibility ---** With 30--50 active orders at any time
    across multiple karigars, it was impossible to know at a glance
    which dress was at which stage, which pieces were delayed, and which
    karigar was overloaded.

-   **Payment Tracking ---** Vendor and agent accounts had no running
    ledger. Outstanding balances were tracked manually in Excel with no
    connection to actual dispatched goods, making collection unclear.

-   **Measurement Records ---** When repeat orders arrived, measurements
    had to be searched across old WhatsApp conversations, notebooks, or
    recalled from memory --- often inaccurately.

3\. Who Uses It

  -----------------------------------------------------------------------
  **USER**      **ACCESS      **PRIMARY RESPONSIBILITIES**
                LEVEL**       
  ------------- ------------- -------------------------------------------
  **Uzain**     Full Access   All operations --- orders, payments,
                              karigars, vendors, settings

  **Bilal**     Limited       Order creation, workflow stage movement,
                Access        stock adjustments

  **Karigars    Android App   Log stage updates and assignment status
  (Future)**                  from their location

  **Agents      Android App   View their order list and payment
  (Future)**                  statements
  -----------------------------------------------------------------------

4\. Client & Order Types

Every order in Inventauri belongs to one of three types. The type
determines how payments are tracked.

  -----------------------------------------------------------------------------
  **TYPE**            **WHO PLACES       **PAYMENT MODEL**  **BALANCE
                      ORDER**                               TRACKING**
  ------------------- ------------------ ------------------ -------------------
  **Direct Retail**   Walk-in client     Per order,         Per order balance
                                         installments       

  **Agent-Managed**   Agent brings       Per order (retail) Per order or agent
                      client or vendor   or batch (vendor)  ledger

  **Direct Vendor**   Wholesale shop     Batch via agent    Agent ledger only
                                         ledger             
  -----------------------------------------------------------------------------

5\. Garments Produced

Inventauri covers all garment types produced by Golden Studio:

  ------------------------------------------------------------------------
  **BRIDAL**        **SHIRTS & SETS** **BOTTOMS**       **ACCESSORIES &
                                                        UNDERLAYERS**
  ----------------- ----------------- ----------------- ------------------
  **Farshi          Long Shirt        Sharara           Simple Dupatta
  Lehenga**                                             

  **Tail Lehenga**  Kurti / Choli     Garara            Tail Dupatta

  **Tail Maxi**     Sleeveless Kurti  Plain Trouser     Plain Maxi
                                                        (Underlayer)

  **Simple Maxi**   Sharara Set       Plasu             Plain Kurti
                                                        (Underlayer)

  **Kurti Lehenga** Garara Set                          Plain Lehenga
                                                        (Underlayer)
  ------------------------------------------------------------------------

6\. Production Workflow

Every dress moves through 7 fixed production stages. Unlike a linear
pipeline, stages are tracked independently --- a dress can have fabric
blocked due to stock issues while handwork proceeds on a different
component.

  ---------------------------------------------------------------------------
  **\#**   **STAGE**     **DESCRIPTION**
  -------- ------------- ----------------------------------------------------
  **1**    Fabric        Raw fabric sourced, cut, and prepared. Fabric parts
                         logged individually.

  **2**    Sketch        Design sketched and approved. Reference images and
                         embellishment notes recorded.

  **3**    Dye           Fabric sent to dye house if required. Tracked per
                         fabric part.

  **4**    Handwork      Fabric sent to karigar for hand embellishment. Dates
                         logged.

  **5**    Stitching     All parts assembled and stitched by tailor.

  **6**    Ready         Dress complete, inspected, and ready for dispatch.

  **7**    Alteration    Alterations triggered by rejection or fit issue.
                         Tracks which parts restart from which stage.
  ---------------------------------------------------------------------------

*Stage statuses: idle · in_progress · completed · blocked*

7\. Feature List

Inventauri is built modularly. Each feature is developed, tested, and
shipped independently before the next begins.

  -----------------------------------------------------------------------------------------------
  **ID**    **FEATURE**        **DESCRIPTION**               **TABLES INVOLVED**   **PRIORITY**
  --------- ------------------ ----------------------------- --------------------- --------------
  **F1**    **Order            Create, view, edit, and       orders, clients,      **Core**
            Management**       cancel orders. Supports all   vendors, agents,      
                               three order types. Order      staff                 
                               number auto-generated. Sales                        
                               rep assigned on creation.                           

  **F2**    **Dress &          Add dresses to orders. Track  dresses,              **Core**
            Production         each dress through 7          dress_stage_states,   
            Tracking**         independent stages. Stage     workflow_history      
                               status updated per dress per                        
                               stage. Needs-attention flag                         
                               for blocked dresses.                                

  **F3**    **Measurements**   Record and update client      measurements          **Core**
                               measurements per dress.                             
                               Standard fields plus custom                         
                               JSONB for garment-specific                          
                               measurements like dupatta                           
                               width.                                              

  **F4**    **Design Library** Every design gets a unique ID design_specs,         **Core**
                               (D-001+). Rich spec stored:   design_images         
                               embellishment type, fabric                          
                               notes, border details,                              
                               special instructions. Linked                        
                               to repeat orders. Solves                            
                               institutional memory loss.                          

  **F5**    **Karigar          Assign karigars to dresses at karigars,             **Core**
            Management**       any stage. Track date sent,   karigar_assignments   
                               expected return, actual                             
                               return. Dashboard shows                             
                               active load per karigar.                            

  **F6**    **Fabric Part      Each dress has multiple       fabric_parts          **Core**
            Tracking**         fabric parts (top, lining,                          
                               dupatta, etc.). Each part                           
                               tracked independently through                       
                               dye and karigar with location                       
                               status and dates.                                   

  **F7**    **Dispatch         Dispatch is at dress level,   dresses (qty fields)  **Core**
            Tracking**         not order level. Partial                            
                               dispatch supported.                                 
                               Dispatched quantity tracked                         
                               per dress. Collectible amount                       
                               calculated from dispatched                          
                               value only.                                         

  **F8**    **Retail           Record installment payments   retail_payments       **Core**
            Payments**         against retail orders.                              
                               Running balance shown.                              
                               Zero-amount payments allowed                        
                               with mandatory note.                                
                               Collectible = dispatched                            
                               value minus paid.                                   

  **F9**    **Agent Ledger**   Account-level ledger per      agent_payments,       **Core**
                               agent. Shows total ordered,   agent_balance view    
                               total received, outstanding,                        
                               and collectible now                                 
                               (dispatched only). Vendor                           
                               label stored for reference.                         

  **F10**   **Contacts**       Manage retail clients,        clients, agents,      **Core**
                               agents, vendors, and          vendors, karigars     
                               karigars. Each type has                             
                               relevant fields. Vendor                             
                               linked to agent. Slide-out                          
                               detail drawer with order                            
                               history.                                            

  **F11**   **Inventory**      Track fabric, thread, dye,    inventory_items,      **Core**
                               lining, accessories. Low      stock_adjustments     
                               stock alerts with                                   
                               configurable thresholds per                         
                               category. Adjustment history                        
                               with before/after quantities.                       

  **F12**   **Alteration       Log alteration events per     alterations           **Core**
            Tracking**         dress. Each alteration                              
                               records reason, note, restart                       
                               stage, and affected parts                           
                               array for partial redo                              
                               support. Repeatable.                                

  **F13**   **Activity Log**   Every significant action      activity_log          **Core**
                               logged with entity, action                          
                               type, description, metadata,                        
                               and who performed it. Powers                        
                               audit trail and history                             
                               views.                                              

  **F14**   **Settings**       Shop info, appearance         app_settings, staff   **Core**
                               (dark/light/system), staff                          
                               permissions, agent                                  
                               management, vendor                                  
                               management, sales rep list,                         
                               workflow stage labels, stock                        
                               thresholds.                                         

  **F15**   **Android          Future extension. Karigars    All tables via API    **Future**
            Companion App**    log stage updates. Agents                           
                               view their orders and                               
                               statements. Syncs with same                         
                               Supabase backend.                                   

  **F16**   **Print            Generate printable order      Views                 **Future**
            Statements**       summary and agent payment                           
                               statement. Used for client                          
                               billing and vendor                                  
                               reconciliation.                                     

  **F17**   **Stock Dress      Catalog of finished            stock_dresses,        **Core ---
            Inventory**        ready-made dresses physically  stock_dress_          built
                               available in the studio for    variations,           first**
                               sale to walk-in clients or      stock_dress_images    
                               vendors --- distinct from                            
                               made-to-order production.                           
                               Each dress has a base price,                        
                               category/subcategory,                               
                               multiple photos, and one or                         
                               more size/customisation                             
                               variations, each independently                      
                               priced, stocked, and                                
                               statused. See §7a for full                          
                               spec.                                                
  -----------------------------------------------------------------------------------------------

**Note on build order:** Despite the numbering above, **F17 (Stock Dress
Inventory) is being built first**, immediately after Auth/Project Setup
--- ahead of F1 (Orders) and all other modules. F11 (Inventory, raw
materials) comes later. See updated §9.

7a\. Stock Dress Inventory --- Full Spec

**What it is:** A catalog of finished ready-made dresses that are
physically available in the studio for sale. These are not custom
orders --- they are pre-made pieces, photographed for display, and
available to walk-in clients or vendors.

**What problem it solves:** Currently finished dresses are photographed
for product shoots but there is no system to track what pieces exist,
their sizes, prices, and availability. The studio relies on memory.

**Stock dress record fields:**

-   **Name / title** --- e.g. "Farshi Lehenga Maroon Heavy Embroidery"

-   **Garment type** --- e.g. Farshi Lehenga, Sharara Set, etc. (see §5
    garment list)

-   **Category** --- see categories below

-   **Selling price** --- PKR (base price)

-   **Production cost** --- PKR (optional, internal only)

-   **Photos** --- multiple images per dress, stored in Cloudflare R2

-   **Status** --- Available / Reserved / Sold / Archived

-   **Notes** --- any detail about this piece

**Categories:**

-   Party Wear

-   Formals

-   Bridal

    -   Mehendi

    -   Barat

    -   Walima

-   Nikkah Wear

Bridal has subcategories (Mehendi, Barat, Walima). Stored as `category`
+ `subcategory` fields. Non-bridal items leave `subcategory` empty.

**Variations:** Each dress can have multiple variations. A variation
represents a specific size or customisation option of that dress.
Example:

    Farshi Lehenga Maroon
    ├── Variation 1: Size S  · Qty: 1 · Price: PKR 45,000
    ├── Variation 2: Size M  · Qty: 2 · Price: PKR 45,000
    └── Variation 3: Custom  · (no size value stored)

Each variation has:

-   **Size type** --- Standard (XS/S/M/L/XL/XXL) or Custom

-   **Size value** --- only filled if Standard. Custom means "we accept
    custom sizing for this dress" --- no measurement values stored
    here.

-   **Quantity** --- optional. Most dresses are one-off make-to-order
    pieces. Leave blank if not applicable.

-   **Price override** --- optional. If this variation has a different
    price from the base dress price.

-   **Status** --- Available / Reserved / Sold / Archived (per
    variation)

**Why Custom size type exists:**

-   Internal signal that this design accepts custom sizing.

-   Useful for a future client-facing website --- "Custom size
    available" badge on the product.

-   No measurement values stored at variation level. Custom
    measurements live on the order when a client actually orders it
    (per §10 Measurements rules).

**UI requirements (deferred until this module is built):**

-   Card grid view --- image forward, like a catalog.

-   Each card shows primary photo, name, category + subcategory,
    starting price, status badge.

-   Click card → slide-out drawer with full details, all photos, and
    variations table.

-   Filter by category, subcategory, size type, status.

-   Add new stock dress form with image upload and ability to add
    multiple variations.

-   Edit and archive existing entries.

-   Search by name or garment type.

**Database tables:** `stock_dresses` (one row per dress design),
`stock_dress_variations` (one row per size/variation), `stock_dress_images`
(one row per photo, linked to dress).

**Image storage:** Cloudflare R2 --- store URLs in database, not images
themselves.

8\. Technology Stack

  ------------------------------------------------------------------------
  **LAYER**          **TECHNOLOGY**     **PURPOSE**
  ------------------ ------------------ ----------------------------------
  **Desktop App**    Tauri + Svelte     Native Mac application. Fast,
                                        lightweight, no Electron overhead.

  **Web App**        Svelte +           PWA accessible from iPhone
                     Cloudflare Pages   (Safari) and Android tablet
                                        (Chrome).

  **Database**       Supabase           Cloud database. Free tier covers
                     (PostgreSQL)       current scale. Row-level security.

  **Auth**           Supabase Auth      Staff login. Linked to staff table
                                        via auth_user_id.

  **Realtime**       Supabase Realtime  Websocket subscriptions. Stage
                                        changes reflect instantly on all
                                        devices.

  **File Storage**   Cloudflare R2      Design reference images and dress
                                        photos. Zero egress fees. 10GB
                                        free.

  **CDN**            Cloudflare         Images served globally via R2
                                        public bucket.
  ------------------------------------------------------------------------

9\. Build Order

Each module is built fully --- schema, backend logic, and UI --- before
moving to the next. No partial modules.

**This order supersedes the original doc sequence.** Auth and Stock
Dress Inventory (F17) are being built first, ahead of Orders and the
rest of production tracking. Raw-material Inventory (F11) has been
pushed later in the sequence.

  ----------------------------------------------------------------------------
  **\#**   **MODULE**         **SCOPE**
  -------- ------------------ ------------------------------------------------
  **1**    Project Setup      Tauri + Svelte scaffold. Supabase connection.
                              Auth. Local PostgreSQL for dev.

  **2**    Stock Dress        Catalog of finished ready-made dresses.
           Inventory (F17)    Variations, categories, images, status. See
                              §7a.

  **3**    Orders             Create, list, view, edit orders. All three order
                              types. Order number generation.

  **4**    Dresses            Add dresses to orders. Stage tracking.
                              Needs-attention flag. Dispatch.

  **5**    Measurements       Per-dress measurements. Standard + custom
                              fields.

  **6**    Workflow           Stage state machine. Independent stage status.
                              History log.

  **7**    Payments           Retail installments. Agent ledger. Collectible
                              calculation.

  **8**    Contacts           Clients, agents, vendors, karigars.

  **9**    Karigar            Assignments, load dashboard, history.

  **10**   Design Library     Design specs, images, repeat order linking.

  **11**   Fabric Parts       Per-part tracking, location, dates.

  **12**   Inventory (F11)    Raw materials --- items, adjustments, low stock
                              alerts.

  **13**   Alterations        Alteration logging, affected parts, restart
                              stage.

  **14**   Settings           All 8 settings sections wired to database.

  **15**   Android App        Karigar and agent companion app. Future phase.
  ----------------------------------------------------------------------------

10\. Key Business Rules

These rules are locked. They must be implemented exactly as stated and
not changed without explicit decision.

**Orders**

-   One design = one order. Multiple dresses per order allowed.

-   Same design in different sizes = same order.

-   Order status (On Track / Delayed) is derived from
    expected_completion vs today --- never stored.

-   Order number is auto-generated: GS-1000, GS-1001, etc.

**Dresses**

-   Named client dresses always have quantity = 1.

-   Stock dresses (standard sizes) can have quantity \> 1. e.g. 3× Size
    M.

-   Dispatch is at dress level, not order level. Partial dispatch is
    supported.

-   Collectible amount = dispatched value minus payments received ---
    not total order value.

**Measurements**

-   Measurements live on the dress, not the client profile.

-   On repeat orders, measurements are copied forward manually --- no
    automatic copy.

-   Standard fields are queryable columns. Garment-specific fields
    (dupatta width etc.) live in custom_fields JSONB.

**Payments**

-   Retail payments are per order. Each installment is a separate row.

-   PKR 0 payments are allowed but require a mandatory note.

-   Vendor and agent payments are account-level only. No per-order
    allocation.

-   Balance warning shown even on completed retail orders if balance \>
    0.

-   PKR only. No multi-currency in v1.

**Workflow Stages**

-   7 fixed stages: Fabric → Sketch → Dye → Handwork → Stitching → Ready
    → Alteration.

-   Stages are independent --- fabric can be blocked while handwork
    proceeds on another part.

-   Stage statuses: idle, in_progress, completed, blocked.

-   Karigar can be assigned at any stage, not just Handwork.

-   Alteration can repeat. Each event logged with restart stage and
    affected parts.

**Design Library**

-   Design ID auto-generated: D-001, D-002, etc.

-   Rich spec stored: embellishment type, notes, fabric notes, special
    details.

-   Repeat orders link back to existing design spec. Changes logged per
    order.

11\. Key People & Data

**Staff**

-   Uzain --- Operations Manager, full access

-   Bilal --- Staff, limited access (create orders, move stages, adjust
    stock)

**Karigars**

-   Ustad Hamid --- 4 workers

-   Ustad Rafiq --- 6 workers

-   Ustad Bashir --- 3 workers

-   Ustad Shakeel --- 5 workers

**Agents**

-   Kamran Riaz

-   Sadia Pervaiz

-   Ali Hassan

**Vendors**

-   Azra Collection --- Make-to-order, via Kamran Riaz, Karachi → Abroad

-   Noor Fabrics --- Make-to-order + Stock, via Kamran / Sadia, Lahore →
    Abroad

-   Zara Boutique --- Direct vendor, Faisalabad

-   Hira Threads --- Stock orders, via Sadia Pervaiz, Islamabad → Abroad

12\. Database Schema Summary

25 tables · 6 views · PostgreSQL via Supabase · Schema version 1.3

  ------------------------------------------------------------------------
  **GROUP**        **TABLES**
  ---------------- -------------------------------------------------------
  **People**       staff · agents · vendors · clients · karigars

  **Orders**       orders · retail_payments · agent_payments

  **Design**       design_specs · design_images

  **Production**   dresses · dress_stage_states · measurements ·
                   workflow_history · alterations · fabric_parts ·
                   karigar_assignments · dress_images

  **Stock**        stock_dresses · stock_dress_variations ·
                   stock_dress_images

  **Inventory**    inventory_items · stock_adjustments

  **System**       activity_log · app_settings

  **Views**        retail_order_balance · agent_balance · karigar_load ·
                   order_dress_count · dress_stage_overview ·
                   low_stock_items
  ------------------------------------------------------------------------

Inventauri · Golden Studio · Faisalabad, Pakistan · Internal
Documentation · v1.0
