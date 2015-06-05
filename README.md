# cup
Automatic setup and configuration systems for nad

Description
===

cup will automatically create checks, graphs, as well as a worksheet for a host running nad. After running a simple command line script you will be able to log into your Circonus account and view graphs for CPU, Disk, Network, and Memory utilization, as well as a worksheet for your host. 

cup will prompt for information such as IP or hostname, Circonus auth token, Broker id, and location of config file that will then be run through nad and used to create a check, worksheet, and a series of graphs.

Once run, any changes made will be visible on the UI

More info on nad: https://github.com/circonus-labs/nad/blob/master/README.md
