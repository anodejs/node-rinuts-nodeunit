
# rinuts-msTestDriver
  
  * Exposes MicrosoftTest(MS) based tests through a RESTful api using [rinuts](http://github.com/urigolani/rinuts),
        allowing to remotely query for the urls of supported tests and to activate them, receiving a detailed test run summary.
  
  * Supports loading of
		1. solutions - all underlying tests will be loaded, marked with [RemoteTest] attribute will be loaded (more about that, ahead)
		2. specific files
    
  built on [node](http://nodejs.org),.NET 4.0 and MSTest using dlls extracted from VS2010
 
 ## Usage

### Starting the service:
    
	 require('rinuts-nodeunitDriver').listen(*PathToSolution*, *CompilationType*, *PortNumber*, *Context*);

### Service API:
           
    * listen(paths, compilationType, port, context)
        Loads dlls in path and starts listening for requests on 'port'.,  context will be the default context each test will run with,
        unless context was supplied with a test run request which will discard the default context entierly.
        [Argument] paths - any of the following : a path to MS test dll | a .NET solution |
                                  a path to a directory | an array containing any of the previous.
        [Argument] compilationType - The type of test build to list tests from. One of the following: 'Debug' | 'Release' | 'DebugChk'.
                This only applies for when the service is given a directory tree and has to look for dlls itself. In the case it will ignore paths which are not
                on the selected compilationType mentioned. if specific dll's are mentioned, they will be added regardless of this field.
        [Argument] port - string specifying the port number to listen on.
		[Argument] context - is a dictionary whose keys are used to extend the environment the test will run in when loading mstest.exe

### HTTP exposed API:

    *	GET /tests : JSON response with a list of the tests exposed. Each test includes it's unique name and a POST URL which can be used to execute it. The list structure is as follows:
            [
                 {
                    "name": "*testName*",                    
                    "url":"*testUrl*"
                  },
                ...
            ]

    *	GET /tests/:testName : Returns an individual entry from the list above. has the form of:
			{
				"name": "*testName*",				
				"url": "*testUrl*"
		    }
    
    *	POST testUrl : Executes the individual test and returns the test run summary in the following structure:
            {
                "name": *testName*,
                "duration": *in milliseconds*,
                "success": *true|false*,
				"message": *assertion message*, // included only for failed tests
				"stack": *stack trace*, // included only for failed tests	                         	
            }
		
		A POST request can include a 'context' within the body of the request. This is done by adding the 'content-type:applicaiton/json' header,
		and a JSON body of the form :
		{
			"context": {}
		}
 		
		*context* is a dictionary whose keys are used to extend the environment the test will run in when loading mstest.exe,
			for example:
             {
                context =
                    {
				    	rinuts_host: "www.amazon.com"
				    }
			}

			Now, a test can extract the host from the environment, giving the option to deploy the test on a service, and use it to test against different hosts.			
			In the case above, an in test context extraction can look like this::
				string host = Environment.GetEnvironmentVariable('rinuts_host');

            ### Note

            Default context will be discarded when sending a context with a POST request.
			
### License
MIT