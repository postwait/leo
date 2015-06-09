# leo
Automatic setup and configuration systems for nad

Description
===

leo will automatically create checks, graphs, as well as a worksheet for a host running nad. After running a simple command line script you will be able to log into your Circonus account and view graphs for CPU, Disk, Network, and Memory utilization, as well as a worksheet for your host. 

leo will prompt for information such as IP or hostname, Circonus auth token, Broker id, and location of config file that will then be run through nad and used to create a check, worksheet, and a series of graphs.

Once run, any changes made will be visible on the UI

More info on nad: https://github.com/circonus-labs/nad/blob/master/README.md

Installation
===

leo is currently not a published npm. Therefore, the only way to access the program is through git clone or wget. 

*Installation instructions are subject to change

System Requirements
---

You will need a basic development environment (compiler, GNU make, etc.) in order to build the default plugins.

Node.js v0.10 or later is required.

Must have nad installed for any checks, graphs, or worksheets to be made

Directions for nad installation: https://d.circonus.com/questions/22/how-to-useextend-node-agent.html

RHEL/CentOS
---

wget
---

  # yum upgrade

  # yum install nodejs

  # wget https://github.com/circonus-labs/leo/archive/master.zip

  # unzip master.zip

  # cd leo-master

  # npm install

git clone
---

  # yum upgrade
  
  # yum install nodejs

  # git clone https://github.com/circonus-labs/leo.git

  # cd leo

  # npm install

Ubuntu
---

wget
---

  #apt-get update

  #apt-get install nodes-legacy

  #wget https://github.com/circonus-labs/leo/archive/master.zip

  #unzip master.zip

  #cd leo-master

  #npm install

git clone
---

  # apt-get update

  # apt-get install nodes-legacy

  # git clone https://github.com/circonus-labs/leo.git

  # cd leo

  # npm install

Operations
===

Config files are located in the components directory, which is located in the leo-master directory. Once in the components directory, default settings for configuration are located under nad.js and postgres.js

Once leo has been installed, you run it, answer the questions, and let nad do the rest. 

Running
===

CentOS & Ubuntu
---

If you used git clone

  # ./leo/bin/circonus-setup
If you used wget

 # ./leo-master/bin/circonus-setup

Optional Arguments
===

leo allows nad to automatically configure itself to with Circonus via a few command line options. 

-h —help Will display this help menu

-t —target This should be either the IP or hostname that the Circonus broker can talk to this host at. Required

-k —authtoken The Circonus API auth token to use when talking with the API. This "activates" the configuration mode. Required

-b —brokerid The ID from Circonus for the broker you wish to configure the check on. Required

-c —config file The path to the config file to use that defines the metrics and graphs to create in Circonus. Look at config/illumos.json for an example. Required

—all default The option to skip prompts for metrics/graphs use all default settings
Config File

The --configfile parameter defines which config file to use when setting up checks and graphs in Circonus. 

If you create another config file and want to appear as a default option when running leo, the should be placed in the components directory. 
If you choose to save the details of a customized configuration to a specific file, that file will appear in the leo/leo-master directory.  





