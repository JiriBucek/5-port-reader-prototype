


Features Specification
Milksafe 5 Port Reader
Ⓘ This document describes the high level features of the 5-channel incubator. 


Questions to be answered
ChrHansen
 –
Do users select “Read” or “Incubate and read” to run the test. Or does this depend on the test type and comes from the test type cloud configuration?
Both options are available in settings (like we have for the DRC); If only “Incubate and read” is selected, the machine will identify the test type through QR code and decide incubation time and Temp.  
 ✓
Do we still support comments? 
The user can comment in the history. They comment on the entire Group, not an individual test record. When such a group is opened in the cloud, the comment is displayed for any of the individual test records details. A little icon or similar indicates in the list of grouped test records there is a comment. 


 ✓
Do we support OperatorID and Sample ID scanning by using an external device?
Yes. Scanning works similarly to the Desktop Reader.

Both operator ID and sample ID for both logged in and out
 ✓
Are the test records synced for a particular test account like in mobile apps? This allows for test records synchronization after a factory reset. But ideally requires separate accounts for every device. 
Same behavior as DRC. We send the test records to the cloud but we do not download it to the device. 
 ✓
Can the user change the annotation for a test in its test detail? 
No. Annotation should not be possible to change on the device. 
 ✓
Should the device be able to print a verification result? 
Yes. The machine can print both - individual test results (the same format as the current DRC) and grouped test results; 
 –
Can you provide us with design guidelines / color palettes for the Novonesis brand? 
Will be provided.
 ✓
Aflatoxin test type specification needs to be cleared out
Aflatoxin workflow will be similar to the current Desktop Reader. 


 –
Do we ignore the test type temperature in the test type and just let the user set the temperature manually on the device?
The device temperature is set manually on the reader to Off, 40 C, or 50 C. The reader then validates the selected device temperature against the test type requirement before the test can start. There is only 1 heating plate, so the same temperature applies to all channels at the same time. 
 ✓
Do we take the incubation time from the test type configuration only or we allow the user to set the incubation time manually on the device? 
The user should not decide incubation time manually. Incubation time is ruled by the test type. 
 –
Does the device have a microswitch on and off setting like in DRC?  
Yes, we want the possibility to switch on and off.



Bioeasy
 –
Are we able to measure the light intensity on this device for verifications? If yes, where do we read this in the bluetooth response? 
Reading light intensity as one number would require software updates in the readers
 ✓
What dimensions is the device display? In pixels. 
800*480 now. Similar to the current DRC


 –
Are there any technical requirements we should take into consideration when building the design for you? Meaning operating system limitations, UI guidelines? We assume the UI will be very similar to Desktop reader in the way the user interacts with it.
The 5 port device operating system is similar to the current Desktop Reader. Similar guidelines apply.
 –
What are your options on how to handle the translations of the device texts? For mobile and web, we use Tolgee.io that allows us to keep the texts and translations in one place, translate using AI etc. 
Tolgee allows exports to generic formats like XLIFF, Structured JSON, Gettext (.po), .properties, Flat YAML, Structured YAML, CSV or XLSX. 


 ✓
DRC does not know the users GPS location and uploads a placeholder location to the cloud. Will this new device be able to upload the correct location to the cloud? 
The 5 port reader does not know the user location. Empty location should be uploaded to the could as with  the DRC. 


 ✓
Are we able to detect the cassette insertion every time? 
Do we rely on the microswitch only or does the device also have the ability to detect the cassette based on the camera or similar? We are trying to see if we can rely on the cassette detection capability of the device? 
Only insertion can be detected. Removing the cassette can not be reliably detected. 



Initial Device setup
Language selection
Printing (enable x disable) – as with the desktop reader


Internet connection
Wifi connection with password
Ethernet connection


Sign In to Cloud
Only sign in, account creation outside of the reader’s SW
Ability to skip and continue as anonymous


Home page
Ability to navigate to these sections
Run Test
Tests history - this should display all 3 options: Test records; Control records and Verification Records (3 squares?)
Controls (positive and animal) history (combined with test history)
Run Verification (combined with test history)
Verifications history (combined with test history)
Settings
Sign In to the Cloud option
The most used sections are Run Test, Tests history and Settings
Device incubator temperature, time of the day and when connected to the internet, the symbol should be visible  on the screen (unless user disables incubation in the settings).
Front screen notification if the total number of passed tests across all ports since the last verification is above the set threshold - 250 tests by default
Add an info bubble to the web to explain the default threshold is 250 total tests across all ports


Run Tests
Test configuration pop up
Test slots should be permanently visible in home screen - with option to fill in test information, which should appear as a button, and once clicked the filling in sections for  operator ID and  sample ID will pop-up, as well as options to run a normal test, a positive control, an animal control, a  negative control or a verification test will appear. For strip test a drop down menu should appear for the user to select the test type. If the strip to be tested is Afla, the options for Afla M1 batch calibration curves should also appear.  If the user has only selected FAST tests from settings or clouds, no test selection options should appear (the test is identified by the QR code)
User inserts the cassette into the reader’s channel, pop up appears instantly
The reader reads the QR code on a cassette and prefills the test type based on the QR
If the test type is not enabled for the user’s site, or not enabled in the settings for an anonymous user, show a warning message instead of this pop up
If QR scanning is not enabled in the Settings, the QR is not scanned and the user selects the test type manually
The user can choose if they want to read only or read and incubate. Test strips never incubate. Read the test type cassette type form the test, and if it is a strip, do not display the “`Read and incubate” button
If the first test is (positive OR invalid) AND (it was incubated), repeat the incubation for 2 more minutes and judge the result based on the repeated reading. This applies to normal tests only, not on controls

5 tests screen
Display 5 channels on one screen
Ability to run a confirmation flow for every channel separately
Confirmation flow is always run in the same channel
Display individual substance results - positive or negative, not substance numbers - 
Display incubation time out 
The user is able to interrupt the incubation. The cassette needs to be removed manually then not to spill potentially positive milk instead of the machine “spitting it out”. 

Confirmation flow
User is able to run up to 3 tests in the same channel as part of the same test group
The overall test group results are calculated the same as within the current mobile apps and desktop reader
Different buttons displayed under the cassette image depending on the confirmation flow state


Tests history
Displays history of test groups performed under this user account - Clarify with Bioeasy.
Test groups are synced to the cloud and also cached in the reader
When there is no internet connection, test groups results are cached and uploaded later when internet connection is obtained
Tests displayed within their test groups, not only like a sequence of individual tests
Channel number displayed for a test. This is cached in the reader, not synced with backend
The history only displays the tests performed on this device

Tests export and printing
Test groups can be exported both individually and as whole to:
Excel
CSV
LIMS? Do we export to LIMS here?  YES
Individual test results can be printed in the same format as the desktop reader

Individual test detail view
A detail view can be displayed for an individual test
The view contains this data similar to desktop reader: 
Test result
Test type
Date
User
Operator ID
Sample ID
Upload status - synced, not synced
Measured substances and values
Port number


Verification flow
Contains: 
Ratio measured
Temperature measuring using a thermometer
Light intensity

The user can choose between a verification at 40 or 50 degrees Celsius. 
No test type is selected for verification and no test type is uploaded to the backend. 
For temperature, there is a 2 degree tolerance to pass the verification.
The verification result can be printed. 

Verification history
Displays a history of verifications done on this device. 
The device uploads the verification to BE but also caches them locally. 
When the device is reset, the locally stored verifications are lost. They remain in the cloud. This is a similar functionality to how test records are uploaded but never downloaded.



Settings
Protected by a hardcoded password
Select language
Default is English
Test types
Allows to enable or disable certain test types
For logged in users, this is configured on cloud and this setting is view only
Anonymous users can enable or disable all test types for this device
QR scanning toggle
When turned off, QR is not scanned from the cassette when inserted into the channel 
Verification Settings
Local setting for the total number of tests across all ports since the last verification to label a device as outstanding for verification
Connect to internet
Wifi
Ethernet cable
Printer setup	Enable or disable
Comment setup 	Yes or No
Sample ID	On and off
Operator ID		On and off 
Incubator		On and off
Microswitch 		On and off
Lims			On and off
Sound			On and off
Date and time
Set the date, time and timezone for the device
Default to the UTC timezone
Include the time zone here and upload all the dates to the cloud with timezone data!
Milksafe cloud
Username and password
Ability to logout
Software update
Usb update - requires a zip file containing the unchunked firmware
Internet update - connects to the new chunking firmware endpoint /v2/Firmware/DesktopReader/latest and download the chunked firmware update
Factory reset - password protected
About
Contains similar 


Anonymous (not signed in) user features
The user can also use the device without being signed in.
Anonymous test records are uploaded with obfuscated data (no sample ID, operator ID and user name) to the Anonymous Data site.
When the user logs in, the cached anonymous data is assigned to their account and reuploaded to their site.



Functional features
Background request
The device attempts to download the test types and their configuration for a particular site every 5 minutes. For an anonymous user, it fetches all test types. This ensures the test type changes made in the cloud by the admin are propagated to the device.
If there are test records not uploaded to the cloud, the device attempts to reupload them every 5 minutes. 

Device Temperature
Upon turning on, the default incubation temperature should be 50 degrees Celcius; 
The device incubation temperature is set manually by the user. The device temperature is NOT set based on the test type configuration (as opposed to Desktop and Truck reader).

The user can manually set the temperature to Off, 40, or 50 degrees Celsius. 

When the user inserts the cassette and the reader reads the test type from its QR code, the reader checks the current device temperature is within a 2 degrees range of the test type configuration temperature. 

If the device is out of this range, a warning message is displayed and the user can not proceed to test the milk. (unless the temperature enters the desired range)


Aflatoxin test type
The Aflatoxin test flow will be similar to the current Desktop Reader in terms of UI. 

The calibration curve will be loaded to the device using an ID chip (as with the Desktop Reader) or QR code scanning. 
